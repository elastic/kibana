/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  InvestigationBlindSpot,
  InvestigationInput,
  InvestigationRecommendation,
} from './investigation';

const NEXT_STEP_SECTION_TITLES = ['next steps', 'recommendations', 'try next'];

const extractMarkdownSection = (markdown: string, sectionTitles: string[]): string | undefined => {
  const lines = markdown.split('\n');
  let startIndex = -1;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line.startsWith('#')) {
      continue;
    }
    const heading = line
      .replace(/^#+\s*/, '')
      .trim()
      .toLowerCase();
    if (sectionTitles.includes(heading)) {
      startIndex = index + 1;
      break;
    }
  }

  if (startIndex < 0) {
    return undefined;
  }

  const sectionLines: string[] = [];
  for (let index = startIndex; index < lines.length; index += 1) {
    if (lines[index].trim().startsWith('#')) {
      break;
    }
    sectionLines.push(lines[index]);
  }

  return sectionLines.join('\n').trim() || undefined;
};

const trimRecommendationTitle = (title: string): string => title.trim().replace(/:$/, '');

const trimRecommendationDescription = (description: string): string =>
  description.trim().replace(/:$/, '');

const normalizeRecommendationText = (text: string): string => {
  let normalized = text.trim();
  if (normalized.endsWith('**') && (normalized.match(/\*\*/g)?.length ?? 0) % 2 !== 0) {
    normalized = normalized.slice(0, -2).trim();
  }
  return trimRecommendationTitle(normalized);
};

const splitRecommendationBullet = (bullet: string): InvestigationRecommendation => {
  const trimmed = normalizeRecommendationText(bullet.replace(/^[-*]\s*/, '').trim());
  const dotSeparator = trimmed.indexOf(' · ');
  if (dotSeparator > 0) {
    return {
      title: trimRecommendationTitle(trimmed.slice(0, dotSeparator)),
      description: trimRecommendationDescription(trimmed.slice(dotSeparator + 3)),
    };
  }

  const sentenceEnd = trimmed.search(/[.!?](?:\s|$)/);
  if (sentenceEnd > 0 && sentenceEnd < trimmed.length - 1) {
    return {
      title: trimRecommendationTitle(trimmed.slice(0, sentenceEnd + 1)),
      description: trimRecommendationDescription(trimmed.slice(sentenceEnd + 1)),
    };
  }

  return { title: trimRecommendationTitle(trimmed) };
};

const parseNextStepsRecommendations = (section: string): InvestigationRecommendation[] => {
  const recommendations: InvestigationRecommendation[] = [];
  let isCollectingCode = false;
  let codeLines: string[] = [];

  const attachCodeToLastRecommendation = (code: string | undefined): void => {
    if (!code || recommendations.length === 0) {
      return;
    }
    recommendations[recommendations.length - 1].code = code;
  };

  for (const rawLine of section.split('\n')) {
    const trimmed = rawLine.trim();

    if (trimmed.startsWith('```')) {
      if (isCollectingCode) {
        attachCodeToLastRecommendation(codeLines.join('\n').trim() || undefined);
        codeLines = [];
        isCollectingCode = false;
      } else {
        isCollectingCode = true;
      }
      continue;
    }

    if (isCollectingCode) {
      codeLines.push(rawLine);
      continue;
    }

    if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
      recommendations.push(splitRecommendationBullet(trimmed));
    }
  }

  if (isCollectingCode) {
    attachCodeToLastRecommendation(codeLines.join('\n').trim() || undefined);
  }

  return recommendations;
};

/** Prose conclusion for the card panel — strips a `## Conclusion` wrapper when present. */
export const getConclusionBody = (conclusion: string | undefined): string | undefined => {
  if (!conclusion?.trim()) {
    return undefined;
  }
  const body = extractMarkdownSection(conclusion, ['conclusion']) ?? conclusion.trim();
  return body.replace(/^#+\s*conclusion\s*$/im, '').trim() || undefined;
};

export const parseMarkdownRecommendations = (
  conclusion: string | undefined
): InvestigationRecommendation[] => {
  if (!conclusion) {
    return [];
  }
  const section = extractMarkdownSection(conclusion, NEXT_STEP_SECTION_TITLES);
  return section ? parseNextStepsRecommendations(section) : [];
};

export const mapGapsFound = (gaps: string[] | undefined): InvestigationBlindSpot[] =>
  (gaps ?? []).map((gap) => {
    const separatorIndex = gap.indexOf(' · ');
    if (separatorIndex > 0) {
      return {
        title: gap.slice(0, separatorIndex).trim(),
        description: gap.slice(separatorIndex + 3).trim(),
      };
    }

    const sentenceEnd = gap.search(/[.!?](?:\s|$)/);
    if (sentenceEnd > 0 && sentenceEnd < gap.length - 1) {
      return {
        title: gap.slice(0, sentenceEnd + 1).trim(),
        description: gap.slice(sentenceEnd + 1).trim(),
      };
    }

    return { title: gap.trim(), description: gap.trim() };
  });

/** Prefer structured fields; fall back to markdown `conclusion` / `gaps_found`. */
export const normalizeInvestigationInput = (input: InvestigationInput): InvestigationInput => {
  const recommendations =
    input.recommendations && input.recommendations.length > 0
      ? input.recommendations
      : parseMarkdownRecommendations(input.conclusion);
  const blindSpots =
    input.blind_spots && input.blind_spots.length > 0
      ? input.blind_spots
      : mapGapsFound(input.gaps_found);

  return {
    ...input,
    conclusion: getConclusionBody(input.conclusion),
    recommendations,
    blind_spots: blindSpots,
  };
};
