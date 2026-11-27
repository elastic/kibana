/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  COLOR_MODES_STANDARD,
  EuiCheckbox,
  EuiFilterButton,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { kiLabelCapitalizeCss } from '../ki/shared/ki_type_display';
import { formatKiTypeLabel } from '../../utils/ki_display';
import {
  getKiGraphGlyphIconScale,
  getKiGraphKindGlyphAppearance,
  getKiGraphNodeGlyphColors,
} from './ki_graph_glyph_styles';
import type { KiGraphLegendFilterEntry } from './ki_graph_filter';
import { isKiGraphFilterKeyVisible, KI_GRAPH_LEGEND_KIND_ORDER } from './ki_graph_filter';
import { KI_GRAPH_NODE_STROKE_WIDTH, KiGraphNodeShape } from './ki_graph_node_shape';
import type { KiGraphNodeKind } from './types';

const LEGEND_GLYPH_SIZE = 18;

const entityKindTitle = i18n.translate('xpack.contextEngine.kiGraph.legend.entityKind', {
  defaultMessage: 'Entities',
});

const factKindTitle = i18n.translate('xpack.contextEngine.kiGraph.legend.factKind', {
  defaultMessage: 'Facts',
});

const memoryKindTitle = i18n.translate('xpack.contextEngine.kiGraph.legend.memoryKind', {
  defaultMessage: 'Memories',
});

const documentKindTitle = i18n.translate('xpack.contextEngine.kiGraph.legend.documentKind', {
  defaultMessage: 'Documents',
});

const workflowKindTitle = i18n.translate('xpack.contextEngine.kiGraph.legend.workflowKind', {
  defaultMessage: 'Workflows',
});

const crawlerKindTitle = i18n.translate('xpack.contextEngine.kiGraph.legend.crawlerKind', {
  defaultMessage: 'Crawlers',
});

const sizeLegendHint = i18n.translate('xpack.contextEngine.kiGraph.legend.sizeHint', {
  defaultMessage: 'Larger nodes have more connections or occurrences',
});

const zoomLegendHint = i18n.translate('xpack.contextEngine.kiGraph.legend.zoomHint', {
  defaultMessage: 'Zoom in to see more names',
});

const hideUnconnectedLabel = i18n.translate('xpack.contextEngine.kiGraph.legend.hideUnconnected', {
  defaultMessage: 'Hide unconnected documents',
});

const otherEntityLegendLabel = i18n.translate('xpack.contextEngine.kiGraph.legend.otherEntity', {
  defaultMessage: 'Other entity',
});

const factLegendLabel = i18n.translate('xpack.contextEngine.kiGraph.legend.fact', {
  defaultMessage: 'Fact',
});

const memoryLegendLabel = i18n.translate('xpack.contextEngine.kiGraph.legend.memory', {
  defaultMessage: 'Memory',
});

const workflowLegendLabel = i18n.translate('xpack.contextEngine.kiGraph.legend.workflow', {
  defaultMessage: 'Workflow',
});

const crawlerLegendLabel = i18n.translate('xpack.contextEngine.kiGraph.legend.crawler', {
  defaultMessage: 'Crawler',
});

const filterLegendEntryLabel = (entry: KiGraphLegendFilterEntry): string => {
  if (entry.kind === 'workflow') {
    return workflowLegendLabel;
  }
  if (entry.kind === 'crawler') {
    return crawlerLegendLabel;
  }
  if (entry.kind === 'memory' && entry.subtype.trim().length === 0) {
    return memoryLegendLabel;
  }
  if (entry.subtype === 'topic') {
    return otherEntityLegendLabel;
  }
  if (entry.kind === 'fact' && entry.subtype === 'preference') {
    return factLegendLabel;
  }
  return formatKiTypeLabel(entry.subtype);
};

const kindSectionTitle = (kind: KiGraphNodeKind): string => {
  switch (kind) {
    case 'entity':
      return entityKindTitle;
    case 'fact':
      return factKindTitle;
    case 'memory':
      return memoryKindTitle;
    case 'document':
      return documentKindTitle;
    case 'workflow':
      return workflowKindTitle;
    case 'crawler':
      return crawlerKindTitle;
    default: {
      const exhaustiveKind: never = kind;
      return exhaustiveKind;
    }
  }
};

export interface KiGraphLegendProps {
  entries: readonly KiGraphLegendFilterEntry[];
  hiddenKeys: ReadonlySet<string>;
  hideUnconnected: boolean;
  onToggleKey: (key: string, kind: KiGraphNodeKind) => void;
  onHideUnconnectedChange: (checked: boolean) => void;
}

interface LegendFilterRowProps {
  entry: KiGraphLegendFilterEntry;
  isVisible: boolean;
  isDark: boolean;
  onToggle: () => void;
}

const LegendFilterRow = ({ entry, isVisible, isDark, onToggle }: LegendFilterRowProps) => {
  const { euiTheme } = useEuiTheme();
  const { icon } = getKiGraphKindGlyphAppearance(euiTheme, entry.kind, entry.subtype);
  const { fill, borderColor, iconColor } = getKiGraphNodeGlyphColors(
    euiTheme,
    entry.kind,
    true,
    false,
    entry.subtype,
    isDark
  );
  const iconScale = getKiGraphGlyphIconScale(LEGEND_GLYPH_SIZE);
  const label = filterLegendEntryLabel(entry);
  const testKey = entry.key.replace(':', '-');

  const rowContentCss = css({
    display: 'flex',
    alignItems: 'center',
    gap: euiTheme.size.xs,
    minWidth: 0,
  });

  const glyphShellCss = css({
    position: 'relative',
    width: LEGEND_GLYPH_SIZE,
    height: LEGEND_GLYPH_SIZE,
    flexShrink: 0,
  });

  const iconCss = css({
    position: 'absolute',
    top: '50%',
    left: '50%',
    display: 'flex',
    transform: `translate(-50%, -50%) scale(${iconScale})`,
    pointerEvents: 'none',
  });

  const labelCss = css([kiLabelCapitalizeCss, { overflow: 'hidden', textOverflow: 'ellipsis' }]);

  return (
    <EuiFilterButton
      isToggle
      isSelected={isVisible}
      numFilters={entry.count}
      grow={false}
      onClick={onToggle}
      data-test-subj={`contextKiGraphLegendFilter-${testKey}`}
    >
      <span css={rowContentCss}>
        <span css={glyphShellCss} aria-hidden>
          <KiGraphNodeShape
            size={LEGEND_GLYPH_SIZE}
            kind={entry.kind}
            fill={fill}
            backdropFill={euiTheme.colors.backgroundBasePlain}
            stroke={borderColor}
            strokeWidth={KI_GRAPH_NODE_STROKE_WIDTH}
            isSelected={false}
            isHovered={false}
          />
          <span css={iconCss}>
            <EuiIcon type={icon} color={iconColor} size="s" aria-hidden />
          </span>
        </span>
        <EuiText size="xs" css={labelCss}>
          {label}
        </EuiText>
      </span>
    </EuiFilterButton>
  );
};

export const KiGraphLegend = ({
  entries,
  hiddenKeys,
  hideUnconnected,
  onToggleKey,
  onHideUnconnectedChange,
}: KiGraphLegendProps) => {
  const { euiTheme, colorMode } = useEuiTheme();
  const isDark = colorMode === COLOR_MODES_STANDARD.dark;

  const entriesByKind = useMemo(() => {
    const grouped = new Map<KiGraphNodeKind, KiGraphLegendFilterEntry[]>();
    for (const kind of KI_GRAPH_LEGEND_KIND_ORDER) {
      grouped.set(kind, []);
    }
    for (const entry of entries) {
      const list = grouped.get(entry.kind);
      if (list !== undefined) {
        list.push(entry);
      }
    }
    return grouped;
  }, [entries]);

  const panelCss = css({
    maxWidth: 240,
  });

  // Scroll inside the panel: EUI draws the panel border on a positioned layer that would scroll away.
  const panelScrollCss = css({
    maxHeight: 'min(420px, 55vh)',
    overflowY: 'auto',
  });

  const sectionCss = css({
    display: 'flex',
    flexDirection: 'column',
    gap: euiTheme.size.xs,
    marginTop: euiTheme.size.xs,
  });

  const kindWithEntries = KI_GRAPH_LEGEND_KIND_ORDER.filter(
    (kind) => (entriesByKind.get(kind)?.length ?? 0) > 0
  );

  return (
    <EuiPanel
      paddingSize="s"
      hasShadow={false}
      css={panelCss}
      data-test-subj="contextKiGraphLegend"
    >
      <div css={panelScrollCss}>
        <EuiCheckbox
          id="contextKiGraphHideUnconnected"
          label={hideUnconnectedLabel}
          checked={hideUnconnected}
          onChange={(event) => onHideUnconnectedChange(event.target.checked)}
          data-test-subj="contextKiGraphHideUnconnected"
        />
        <EuiSpacer size="s" />
        {kindWithEntries.map((kind, kindIndex) => (
          <div key={kind} css={kindIndex === 0 ? undefined : { marginTop: euiTheme.size.s }}>
            <EuiText size="xs">
              <strong>{kindSectionTitle(kind)}</strong>
            </EuiText>
            <div css={sectionCss}>
              {(entriesByKind.get(kind) ?? []).map((entry) => (
                <LegendFilterRow
                  key={entry.key}
                  entry={entry}
                  isVisible={isKiGraphFilterKeyVisible(entry.key, entry.kind, hiddenKeys)}
                  isDark={isDark}
                  onToggle={() => onToggleKey(entry.key, entry.kind)}
                />
              ))}
            </div>
          </div>
        ))}

        <EuiText size="xs" color="subdued" css={{ marginTop: euiTheme.size.m }}>
          <p>{sizeLegendHint}</p>
          <p>{zoomLegendHint}</p>
        </EuiText>
      </div>
    </EuiPanel>
  );
};
