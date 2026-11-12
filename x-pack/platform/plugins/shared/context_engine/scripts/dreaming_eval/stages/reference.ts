/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import type { AiIndexDreamingConfig } from '../../../common/dreaming';
import type { AiIndexEvalConfig } from '../config';
import { resolveDreaming } from '../config';
import type { StageContext } from '../context';
import { writeJson } from '../download';
import type { ReferenceManifest } from '../reference';
import {
  ALL_SAMPLES,
  indexPrompt,
  indexPromptFileOf,
  promptFileOf,
  referenceDirOf,
  referenceFileOf,
  referenceManifestFileOf,
  referencePrompt,
  renderTranscript,
  transcriptFileOf,
} from '../reference';
import type { EvalConversation } from '../types';
import { getAiIndex } from './configure';
import { isPerSample, readExtracted } from './import';

/** The dreaming config of an AI index as Kibana stores it, else as the eval config gives it. */
const dreamingOf = async (
  context: StageContext,
  aiIndex: AiIndexEvalConfig
): Promise<{ dreaming: AiIndexDreamingConfig; from: ReferenceManifest['dreamingFrom'] }> => {
  try {
    const stored = await getAiIndex(context, aiIndex.id);
    if (stored?.dreaming) {
      return { dreaming: stored.dreaming, from: 'kibana' };
    }
  } catch (error) {
    context.log.debug(
      `Could not read AI index '${aiIndex.id}' from Kibana: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
  return {
    dreaming: resolveDreaming(aiIndex.dreaming, context.config.schedule_interval),
    from: 'config',
  };
};

/** The units of an AI index: each sample when samples run one at a time, else all together. */
const unitsOf = (
  context: StageContext,
  aiIndex: AiIndexEvalConfig
): {
  units: Array<{ unit: string; conversations: EvalConversation[] }>;
  extractedWith: Record<string, unknown>;
} => {
  const extracted = aiIndex.datasets.map((dataset) => ({
    dataset,
    extracted: readExtracted(context, dataset),
  }));
  const extractedWith = Object.fromEntries(
    aiIndex.datasets.map((dataset) => {
      const { presets, ...options } = context.config.datasets[dataset];
      return [dataset, options];
    })
  );
  const perSample = extracted.find(({ dataset }) => isPerSample(context, dataset));
  if (perSample) {
    const byId = new Map(
      perSample.extracted.conversations.map((conversation) => [conversation.id, conversation])
    );
    return {
      units: perSample.extracted.samples.map((sample) => ({
        unit: sample,
        conversations: (perSample.extracted.sampleConversations[sample] ?? []).flatMap(
          (id) => byId.get(id) ?? []
        ),
      })),
      extractedWith,
    };
  }
  return {
    units: [
      {
        unit: ALL_SAMPLES,
        conversations: extracted.flatMap(({ extracted: { conversations } }) => conversations),
      },
    ],
    extractedWith,
  };
};

/**
 * Writes what a coding agent needs to write the reference memories of an AI index: its
 * conversations as transcripts, and a prompt per sample (or one for all) with the AI index's
 * fact, entity and relationship types and the file to write.
 */
export const runReference = async (context: StageContext): Promise<void> => {
  const { config, log } = context;
  for (const aiIndex of config.ai_indices.filter(({ id }) => context.aiIndexIds.includes(id))) {
    const dir = referenceDirOf(config, aiIndex);
    const { dreaming, from } = await dreamingOf(context, aiIndex);
    const { units, extractedWith } = unitsOf(context, aiIndex);

    const written = new Set<string>();
    for (const conversation of units.flatMap(({ conversations }) => conversations)) {
      const file = transcriptFileOf(dir, conversation.id);
      if (!written.has(file)) {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, renderTranscript(conversation));
        written.add(file);
      }
    }

    const prefix = config.reference.prompt_prefix;
    const manifestUnits = units.map(({ unit, conversations }) => {
      const prompt = promptFileOf(dir, unit);
      const output = referenceFileOf(dir, unit);
      fs.mkdirSync(path.dirname(prompt), { recursive: true });
      fs.writeFileSync(
        prompt,
        referencePrompt({
          aiIndex,
          dreaming,
          unit,
          transcripts: conversations.map(({ id }) => transcriptFileOf(dir, id)),
          rounds: conversations.reduce((sum, { rounds }) => sum + rounds.length, 0),
          output,
          prefix,
        })
      );
      return { unit, conversations: conversations.map(({ id }) => id), prompt, output };
    });
    fs.writeFileSync(
      indexPromptFileOf(dir),
      indexPrompt({ aiIndex, units: manifestUnits, prefix })
    );
    const manifest: ReferenceManifest = {
      aiIndexId: aiIndex.id,
      datasets: aiIndex.datasets,
      extractedWith,
      dreamingFrom: from,
      writtenAt: new Date().toISOString(),
      units: manifestUnits,
    };
    writeJson(referenceManifestFileOf(dir), manifest);

    const done = manifestUnits.filter(({ output }) => fs.existsSync(output)).length;
    log.success(
      `${aiIndex.id}: ${manifestUnits.length} reference prompt${
        manifestUnits.length === 1 ? '' : 's'
      } over ${written.size} transcripts, with the dreaming config from ${
        from === 'kibana' ? 'Kibana' : 'the eval config'
      }${done > 0 ? `; ${done} already have reference memories` : ''} → ${path.relative(
        process.cwd(),
        indexPromptFileOf(dir)
      )}`
    );
  }
};
