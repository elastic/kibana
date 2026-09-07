/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  MAX_BLIND_SPOTS,
  MAX_MEDIUM_STRING_LENGTH,
  MAX_RECOMMENDATIONS,
  MAX_TEXT_LENGTH,
  type InvestigationBlindSpot,
  type InvestigationRecommendation,
} from '@kbn/significant-events-schema';

const legacyInvestigationPayloadSchema = z.looseObject({
  conclusion: z.string().optional(),
  gaps_found: z.array(z.string()).optional(),
  recommendations: z.array(z.unknown()).optional(),
  blind_spots: z.array(z.unknown()).optional(),
});

const CONCLUSION_SECTION_TITLES = ['conclusion'] as const;
const NEXT_STEP_SECTION_TITLES = ['next steps', 'recommendations', 'try next'] as const;

/** ATX heading: CommonMark requires the space, and without it `#1 offender` reads as a heading. */
const HEADING = /^#{1,6}\s+/;

interface MarkdownSection {
  /** Heading text, lowercased and stripped of its `#`s. `undefined` for the untitled preamble. */
  readonly title: string | undefined;
  readonly body: string;
}

/**
 * Splits markdown into its headed sections, preceded by an untitled section when the text opens
 * with prose. `#` inside a fenced code block is a comment, not a heading — legacy conclusions embed
 * shell and ini snippets, and reading those as headings would end a section early and drop
 * everything after them.
 */
const splitMarkdownSections = (markdown: string): MarkdownSection[] => {
  const sections: MarkdownSection[] = [];
  let title: string | undefined;
  let bodyLines: string[] = [];
  let isInsideFence = false;

  const closeSection = (): void => {
    const body = bodyLines.join('\n').trim();
    if (title !== undefined || body) {
      sections.push({ title, body });
    }
  };

  for (const line of markdown.split('\n')) {
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      isInsideFence = !isInsideFence;
    } else if (!isInsideFence && HEADING.test(trimmed)) {
      closeSection();
      title = trimmed
        .replace(/^#+\s*/, '')
        .trim()
        .toLowerCase();
      bodyLines = [];
      continue;
    }

    bodyLines.push(line);
  }

  closeSection();

  return sections;
};

const findSectionBody = (
  sections: MarkdownSection[],
  titles: readonly string[]
): string | undefined =>
  sections.find(({ title }) => title !== undefined && titles.includes(title))?.body || undefined;

/**
 * The prose body of a legacy `conclusion`: its "# Conclusion" section when one exists, otherwise
 * the whole string. `undefined` for effectively empty input, matching the schema's own
 * `.optional()`.
 */
const extractLegacyConclusionBody = (
  conclusion: string,
  sections: MarkdownSection[]
): string | undefined => {
  const body = findSectionBody(sections, CONCLUSION_SECTION_TITLES) ?? conclusion.trim();
  return body.replace(/^#+\s*conclusion\s*$/im, '').trim() || undefined;
};

/**
 * Legacy free text is unbounded, but every field it feeds is capped by `investigationStateSchema`,
 * and one over-long value fails the whole payload — losing the conclusion and hypotheses with it.
 * The ellipsis marks the clip, so a truncated value doesn't read as the agent's own full sentence.
 */
const boundText = (text: string, maxLength: number): string =>
  text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;

const boundTitle = (text: string): string => boundText(text, MAX_MEDIUM_STRING_LENGTH);
const boundBody = (text: string): string => boundText(text, MAX_TEXT_LENGTH);

/** A trailing `:` introduced the code block or description that followed; it isn't content. */
const stripTrailingColon = (text: string): string => text.trim().replace(/:$/, '');

/** Unordered (`-`, `*`, `+`) and ordered (`1.`, `1)`) list markers — legacy conclusions used both. */
const BULLET_MARKER = /^(?:[-*+]|\d+[.)])\s+/;

const TITLE_SEPARATOR = ' · ';
const SENTENCE_END = /[.!?](?:\s|$)/;

/** A bullet's text, less its list marker and a bold run the model opened but never closed. */
const stripBulletMarkup = (bullet: string): string => {
  const text = bullet.replace(BULLET_MARKER, '').trim();
  const hasUnclosedBold = text.endsWith('**') && (text.match(/\*\*/g)?.length ?? 0) % 2 !== 0;

  return stripTrailingColon(hasUnclosedBold ? text.slice(0, -2) : text);
};

/** Splits a title off the front of a bullet, at an explicit separator or the first sentence end. */
const splitRecommendationBullet = (bullet: string): InvestigationRecommendation => {
  const text = stripBulletMarkup(bullet);

  const separator = text.indexOf(TITLE_SEPARATOR);
  if (separator > 0) {
    return {
      title: boundTitle(stripTrailingColon(text.slice(0, separator))),
      description: boundBody(stripTrailingColon(text.slice(separator + TITLE_SEPARATOR.length))),
    };
  }

  const sentenceEnd = text.search(SENTENCE_END);
  if (sentenceEnd > 0 && sentenceEnd < text.length - 1) {
    return {
      title: boundTitle(stripTrailingColon(text.slice(0, sentenceEnd + 1))),
      description: boundBody(stripTrailingColon(text.slice(sentenceEnd + 1))),
    };
  }

  return { title: boundTitle(text) };
};

const measureIndent = (line: string): number => line.length - line.trimStart().length;

/** Fenced code nested under a list item carries that item's indentation; strip it. */
const dedentCode = (codeLines: string[]): string | undefined => {
  const indents = codeLines.filter((line) => line.trim()).map(measureIndent);
  const commonIndent = indents.length > 0 ? indents.reduce((a, b) => Math.min(a, b)) : 0;

  const code = codeLines
    .map((line) => line.slice(commonIndent))
    .join('\n')
    .trim();

  return code ? boundBody(code) : undefined;
};

/**
 * Bullets (and any fenced code immediately following one) under a legacy "Next Steps" heading,
 * in the shape of the current `recommendations` field. Capped at the schema's `maxItems`: a legacy
 * conclusion predates that cap and can list more steps than it allows, and recovering an
 * over-long array would fail the whole payload — losing the conclusion, hypotheses and blind
 * spots too, which is worse than recovering no recommendations at all.
 */
const parseLegacyRecommendations = (section: string | undefined): InvestigationRecommendation[] => {
  if (section === undefined) {
    return [];
  }

  const recommendations: InvestigationRecommendation[] = [];
  let isCollectingCode = false;
  let codeLines: string[] = [];

  const attachCodeToLastRecommendation = (): void => {
    const code = dedentCode(codeLines);
    codeLines = [];

    if (code && recommendations.length > 0) {
      recommendations[recommendations.length - 1].code = code;
    }
  };

  for (const rawLine of section.split('\n')) {
    const trimmed = rawLine.trim();

    if (trimmed.startsWith('```')) {
      if (isCollectingCode) {
        attachCodeToLastRecommendation();
      }
      isCollectingCode = !isCollectingCode;
      continue;
    }

    if (isCollectingCode) {
      codeLines.push(rawLine);
    } else if (BULLET_MARKER.test(trimmed)) {
      recommendations.push(splitRecommendationBullet(trimmed));
    }
  }

  if (isCollectingCode) {
    attachCodeToLastRecommendation();
  }

  return recommendations.slice(0, MAX_RECOMMENDATIONS);
};

/**
 * A legacy `gaps_found` entry was a single free-text statement; the current `blind_spots` schema
 * splits that into a bounded `title` and a longer `description`. The full statement becomes
 * `description`; `title` is the same text, truncated only if it exceeds the bound.
 */
const toLegacyBlindSpot = (gap: string): InvestigationBlindSpot => ({
  title: boundTitle(gap),
  description: boundBody(gap),
});

/**
 * Rewrites a raw `structured_output` payload so `investigationStateSchema.safeParse` can read
 * structured recommendations and blind spots from investigations persisted before those fields
 * existed, back when both lived as markdown inside `conclusion` and as free-text `gaps_found`: a
 * legacy "## Next Steps" section is lifted out of `conclusion` into `recommendations`, and
 * `gaps_found` becomes `blind_spots`. Must run BEFORE that parse, which strips the keys it doesn't
 * declare — `gaps_found` would otherwise be unrecoverable.
 *
 * Returns the payload unchanged, by reference, when there is nothing to recover: when it doesn't
 * even loosely resemble an investigation state, so the real schema reports the actual validation
 * error rather than this module masking it; and when it carries no legacy signal at all — i.e.
 * every current investigation.
 *
 * Delete this module and its call site once legacy investigations have aged out (no fixed
 * retention policy — an operational decision).
 */
export const normalizeLegacyInvestigationState = (structuredOutput: unknown): unknown => {
  const parsed = legacyInvestigationPayloadSchema.safeParse(structuredOutput);
  if (!parsed.success) {
    return structuredOutput;
  }

  // `gaps_found` is the one key deliberately dropped; `blind_spots` replaces it below.
  const { gaps_found: gapsFound, ...rest } = parsed.data;
  const { conclusion, recommendations, blind_spots: blindSpots } = rest;

  const conclusionSections = conclusion === undefined ? [] : splitMarkdownSections(conclusion);
  /**
   * The current schema documents `conclusion` as "plain prose (no markdown headings or bullet
   * lists)", so a single heading is a reliable signal that this payload predates structured
   * `recommendations` — no need to enumerate specific titles.
   */
  const legacyConclusion = conclusionSections.some(({ title }) => title !== undefined)
    ? conclusion
    : undefined;
  const legacyGaps = !blindSpots?.length && gapsFound?.length ? gapsFound : undefined;

  if (legacyConclusion === undefined && legacyGaps === undefined) {
    return structuredOutput;
  }

  const normalized: Record<string, unknown> = { ...rest };

  if (legacyConclusion !== undefined) {
    normalized.conclusion = extractLegacyConclusionBody(legacyConclusion, conclusionSections);

    if (!recommendations?.length) {
      const legacyRecommendations = parseLegacyRecommendations(
        findSectionBody(conclusionSections, NEXT_STEP_SECTION_TITLES)
      );
      if (legacyRecommendations.length > 0) {
        normalized.recommendations = legacyRecommendations;
      }
    }
  }

  if (legacyGaps !== undefined) {
    normalized.blind_spots = legacyGaps.slice(0, MAX_BLIND_SPOTS).map(toLegacyBlindSpot);
  }

  return normalized;
};
