/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { monaco } from '@kbn/monaco';
import { i18n } from '@kbn/i18n';
import type { ProcessorMetrics, ProcessorsMetrics, StepStatus, StepSummary } from '../types';
import type { YamlLineMap } from '../utils/yaml_line_mapper';

const SKIPPED_MESSAGE = i18n.translate(
  'xpack.streams.streamlangYamlEditor.simulationStatus.skipped',
  {
    defaultMessage: 'This step was skipped during the last simulation run.',
  }
);
const DISABLED_MESSAGE = i18n.translate(
  'xpack.streams.streamlangYamlEditor.simulationStatus.disabled',
  {
    defaultMessage: 'Simulation is disabled.',
  }
);
const GENERIC_FAILURE_MESSAGE = i18n.translate(
  'xpack.streams.streamlangYamlEditor.simulationStatus.genericFailure',
  {
    defaultMessage: 'Simulation failed for this step.',
  }
);
const PENDING_MESSAGE = i18n.translate(
  'xpack.streams.streamlangYamlEditor.simulationStatus.pending',
  {
    defaultMessage: 'Pending simulation.',
  }
);

const percentageFormatter = new Intl.NumberFormat(i18n.getLocale(), {
  style: 'percent',
  maximumFractionDigits: 1,
});

interface GlyphDescriptor {
  className: string;
  hoverMessage?: string;
}

export const useGutterSimulationMarkers = (
  editor: monaco.editor.IStandaloneCodeEditor | null,
  canRunSimulation: boolean,
  hasSimulationResult: boolean,
  processorsMetrics?: ProcessorsMetrics,
  yamlLineMap?: YamlLineMap,
  stepSummary?: StepSummary
) => {
  const glyphDecorations = useMemo(() => {
    if (!editor) {
      return null;
    }
    return editor.createDecorationsCollection();
  }, [editor]);

  useEffect(() => {
    if (!glyphDecorations) {
      return;
    }

    glyphDecorations.clear();

    if (!editor || !yamlLineMap || !stepSummary || !hasSimulationResult) {
      return;
    }

    const newDecorations: monaco.editor.IModelDeltaDecoration[] = [];

    stepSummary.forEach((status, stepId) => {
      const lineInfo = yamlLineMap[stepId];
      if (!lineInfo) {
        return;
      }

      const metrics = processorsMetrics?.[stepId];
      const glyph = getGlyphForStatus(status, canRunSimulation, metrics);

      if (!glyph) {
        return;
      }

      newDecorations.push({
        range: new monaco.Range(lineInfo.lineStart, 1, lineInfo.lineStart, 1),
        options: {
          isWholeLine: false,
          glyphMarginClassName: `streamlang-sim-glyph ${glyph.className}`,
          glyphMarginHoverMessage: glyph.hoverMessage ? { value: glyph.hoverMessage } : undefined,
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      });
    });

    glyphDecorations.set(newDecorations);

    return () => {
      glyphDecorations.clear();
    };
  }, [
    glyphDecorations,
    editor,
    processorsMetrics,
    yamlLineMap,
    stepSummary,
    canRunSimulation,
    hasSimulationResult,
  ]);
};

function getGlyphForStatus(
  status: StepStatus,
  canRunSimulation: boolean,
  metrics?: ProcessorMetrics
): GlyphDescriptor | null {
  if (!canRunSimulation) {
    return {
      className: 'streamlang-sim-glyph-disabled',
      hoverMessage: DISABLED_MESSAGE,
    };
  }

  switch (status) {
    case 'disabled':
      return {
        className: 'streamlang-sim-glyph-disabled',
        hoverMessage: DISABLED_MESSAGE,
      };
    case 'skipped':
      return {
        className: 'streamlang-sim-glyph-skipped',
        hoverMessage: SKIPPED_MESSAGE,
      };
    case 'pending':
      return {
        className: 'streamlang-sim-glyph-pending',
        hoverMessage: PENDING_MESSAGE,
      };
    case 'failure': {
      const hoverMessage = formatErrorMessages(metrics?.errors ?? []) ?? GENERIC_FAILURE_MESSAGE;
      return {
        className: 'streamlang-sim-glyph-failure',
        hoverMessage,
      };
    }
    case 'successWithWarnings': {
      const hoverMessage = formatErrorMessages(metrics?.errors ?? []) ?? GENERIC_FAILURE_MESSAGE;
      return {
        className: 'streamlang-sim-glyph-warning',
        hoverMessage,
      };
    }
    case 'success': {
      const hoverMessage =
        formatMetricsMessage(metrics) ??
        '**Processor Metrics**\n\nMetrics are not available for this step.';
      return {
        className: 'streamlang-sim-glyph-success',
        hoverMessage,
      };
    }
    default:
      return null;
  }
}

function formatErrorMessages(
  errors: Array<{ type?: string; message?: string }>
): string | undefined {
  if (!errors || errors.length === 0) {
    return undefined;
  }

  const formattedErrors = errors.map((error, index) => {
    const errorType = (error.type ?? 'unknown')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
    const message =
      error.message ??
      i18n.translate('xpack.streams.streamlangYamlEditor.simulationStatus.unknownError', {
        defaultMessage: 'An unknown error occurred.',
      });
    return i18n.translate('xpack.streams.streamlangYamlEditor.simulationStatus.errorEntry', {
      defaultMessage: '**{entry}. {errorType}**\n\n{errorMessage}',
      values: { entry: index + 1, errorType, errorMessage: message },
    });
  });

  return i18n.translate('xpack.streams.streamlangYamlEditor.simulationStatus.errorSummary', {
    defaultMessage: '**⚠️ Processor Errors ({count})**\n\n{errors}',
    values: { count: errors.length, errors: formattedErrors.join('\n\n---\n\n') },
  });
}

function formatMetricsMessage(metrics?: ProcessorMetrics): string | undefined {
  if (!metrics) {
    return undefined;
  }

  const detectedFields = metrics.detected_fields ?? [];
  const parsedRate = metrics.parsed_rate ?? 0;
  const skippedRate = metrics.skipped_rate ?? 0;
  const failedRate = metrics.failed_rate ?? 0;

  const sections: string[] = [];

  const parsedRateStr = formatRate(parsedRate);
  if (parsedRateStr) {
    sections.push(
      i18n.translate('xpack.streams.streamlangYamlEditor.simulationStatus.parsedRate', {
        defaultMessage: '✅ **Parsed:** {rate} of documents',
        values: { rate: parsedRateStr },
      })
    );
  }

  const failedRateStr = formatRate(failedRate);
  if (failedRateStr) {
    sections.push(
      i18n.translate('xpack.streams.streamlangYamlEditor.simulationStatus.failedRate', {
        defaultMessage: '❌ **Failed:** {rate} of documents',
        values: { rate: failedRateStr },
      })
    );
  }

  const skippedRateStr = formatRate(skippedRate);
  if (skippedRateStr) {
    sections.push(
      i18n.translate('xpack.streams.streamlangYamlEditor.simulationStatus.skippedRate', {
        defaultMessage: '⏭️ **Skipped:** {rate} of documents',
        values: { rate: skippedRateStr },
      })
    );
  }

  if (Array.isArray(detectedFields) && detectedFields.length > 0) {
    const fieldCount = detectedFields.length;
    const fieldLabel = i18n.translate(
      'xpack.streams.streamlangYamlEditor.simulationStatus.detectedFieldsLabel',
      {
        defaultMessage: '{count, plural, one {field} other {fields}}',
        values: { count: fieldCount },
      }
    );

    const fieldList = detectedFields
      .map((field) =>
        i18n.translate('xpack.streams.streamlangYamlEditor.simulationStatus.detectedFieldEntry', {
          defaultMessage: '  - `{field}`',
          values: { field },
        })
      )
      .join('\n');

    sections.push(
      i18n.translate('xpack.streams.streamlangYamlEditor.simulationStatus.detectedFields', {
        defaultMessage: '📋 **Detected {count} {label}:**\n{fields}',
        values: { count: fieldCount, label: fieldLabel, fields: fieldList },
      })
    );
  }

  if (sections.length === 0) {
    return undefined;
  }

  return i18n.translate('xpack.streams.streamlangYamlEditor.simulationStatus.metricsSummary', {
    defaultMessage: '**📊 Processor Metrics**\n\n{sections}',
    values: { sections: sections.join('\n\n') },
  });
}

function formatRate(rate?: number): string | null {
  if (rate === undefined || rate === null || rate <= 0) {
    return null;
  }
  return percentageFormatter.format(rate);
}
