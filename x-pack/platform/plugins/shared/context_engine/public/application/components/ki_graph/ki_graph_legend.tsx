/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COLOR_MODES_STANDARD, EuiIcon, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { kiLabelCapitalizeCss } from '../ki/shared/ki_type_display';
import { formatKiTypeLabel } from '../../utils/ki_display';
import { getKiGraphGlyphIconScale, getKiGraphNodeGlyphColors } from './ki_graph_glyph_styles';
import { KI_GRAPH_SYMBOL_LEGEND_ITEMS } from './ki_graph_node_icon';
import { KI_GRAPH_NODE_STROKE_WIDTH, KiGraphNodeShape } from './ki_graph_node_shape';

const LEGEND_GLYPH_SIZE = 18;

const entityShapeTitle = i18n.translate('xpack.contextEngine.kiGraph.legend.entityShape', {
  defaultMessage: 'Entities (hexagon)',
});

const factShapeTitle = i18n.translate('xpack.contextEngine.kiGraph.legend.factShape', {
  defaultMessage: 'Facts (circle)',
});

const sizeLegendHint = i18n.translate('xpack.contextEngine.kiGraph.legend.sizeHint', {
  defaultMessage: 'Larger nodes have more connections or occurrences',
});

const zoomLegendHint = i18n.translate('xpack.contextEngine.kiGraph.legend.zoomHint', {
  defaultMessage: 'Zoom in to see more names',
});

const otherEntityLegendLabel = i18n.translate('xpack.contextEngine.kiGraph.legend.otherEntity', {
  defaultMessage: 'Other entity',
});

const factLegendLabel = i18n.translate('xpack.contextEngine.kiGraph.legend.fact', {
  defaultMessage: 'Fact',
});

const symbolLegendLabel = (kind: 'entity' | 'fact', subtype: string): string => {
  if (subtype === 'topic') {
    return otherEntityLegendLabel;
  }
  if (kind === 'fact') {
    return factLegendLabel;
  }
  return formatKiTypeLabel(subtype);
};

interface LegendSymbolRowProps {
  kind: 'entity' | 'fact';
  icon: string;
  subtype: string;
  label: string;
  isDark: boolean;
}

const LegendSymbolRow = ({ kind, icon, subtype, label, isDark }: LegendSymbolRowProps) => {
  const { euiTheme } = useEuiTheme();
  const { fill, borderColor, iconColor } = getKiGraphNodeGlyphColors(
    euiTheme,
    kind,
    true,
    false,
    subtype,
    isDark
  );
  const iconScale = getKiGraphGlyphIconScale(LEGEND_GLYPH_SIZE);

  const rowCss = css({
    display: 'flex',
    alignItems: 'center',
    gap: euiTheme.size.s,
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

  return (
    <div css={rowCss} data-test-subj={`contextKiGraphLegendSymbol-${subtype}`}>
      <span css={glyphShellCss} aria-hidden>
        <KiGraphNodeShape
          size={LEGEND_GLYPH_SIZE}
          kind={kind}
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
      <EuiText size="xs" css={kiLabelCapitalizeCss}>
        {label}
      </EuiText>
    </div>
  );
};

export const KiGraphLegend = () => {
  const { euiTheme, colorMode } = useEuiTheme();
  const isDark = colorMode === COLOR_MODES_STANDARD.dark;

  const panelCss = css({
    maxWidth: 220,
    maxHeight: 'min(420px, 55vh)',
    overflowY: 'auto',
  });

  const sectionCss = css({
    display: 'flex',
    flexDirection: 'column',
    gap: euiTheme.size.xs,
    marginTop: euiTheme.size.s,
  });

  const entityItems = KI_GRAPH_SYMBOL_LEGEND_ITEMS.filter((item) => item.kind === 'entity');
  const factItems = KI_GRAPH_SYMBOL_LEGEND_ITEMS.filter((item) => item.kind === 'fact');

  return (
    <EuiPanel
      paddingSize="s"
      hasShadow={false}
      css={panelCss}
      data-test-subj="contextKiGraphLegend"
    >
      <EuiText size="xs">
        <strong>{entityShapeTitle}</strong>
      </EuiText>
      <div css={sectionCss}>
        {entityItems.map((item) => (
          <LegendSymbolRow
            key={item.subtype}
            kind={item.kind}
            icon={item.icon}
            subtype={item.subtype}
            label={symbolLegendLabel(item.kind, item.subtype)}
            isDark={isDark}
          />
        ))}
      </div>

      <EuiText size="xs" css={{ marginTop: euiTheme.size.m }}>
        <strong>{factShapeTitle}</strong>
      </EuiText>
      <div css={sectionCss}>
        {factItems.map((item) => (
          <LegendSymbolRow
            key={item.subtype}
            kind={item.kind}
            icon={item.icon}
            subtype={item.subtype}
            label={symbolLegendLabel(item.kind, item.subtype)}
            isDark={isDark}
          />
        ))}
      </div>

      <EuiText size="xs" color="subdued" css={{ marginTop: euiTheme.size.m }}>
        <p>{sizeLegendHint}</p>
        <p>{zoomLegendHint}</p>
      </EuiText>
    </EuiPanel>
  );
};
