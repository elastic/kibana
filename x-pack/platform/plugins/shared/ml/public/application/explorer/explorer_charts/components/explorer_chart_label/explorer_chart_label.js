/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import PropTypes from 'prop-types';
import React, { Fragment, useCallback } from 'react';

import { EuiIconTip, useEuiTheme } from '@elastic/eui';

import { ExplorerChartLabelBadge } from './explorer_chart_label_badge';
import { ExplorerChartInfoTooltip } from '../../explorer_chart_info_tooltip';
import { EntityFilter } from './entity_filter';
import { css } from '@emotion/react';

export function ExplorerChartLabel({
  detectorLabel,
  entityFields,
  infoTooltip,
  isEmbeddable,
  wrapLabel = false,
  onSelectEntity,
  showFilterIcons,
}) {
  // Depending on whether we wrap the entityField badges to a new line, we render this differently:
  //
  // 1. All in one line:
  //   <detectorLabel> - <entityBadge1> <entityBadge2> ... <infoIcon>
  //
  // 2. Multiple lines:
  //   <detectorLabel> <infoIcon>
  //   <entityBadge1> <entityBadge2> ...

  // Using &nbsp;s here to make sure those spaces get rendered.
  const labelSeparator =
    wrapLabel === true || entityFields.length === 0 || detectorLabel.length === 0 ? (
      <>&nbsp;</>
    ) : (
      <>&nbsp;&ndash;&nbsp;</>
    );

  const applyFilter = useCallback(
    ({ influencerFieldName, influencerFieldValue, action }) =>
      onSelectEntity(influencerFieldName, influencerFieldValue, action),
    [onSelectEntity]
  );

  const entityFieldBadges = entityFields.map((entity) => {
    const key = `${infoTooltip.chartFunction}-${entity.fieldName}-${entity.fieldType}-${entity.fieldValue}`;
    return (
      <Fragment key={`badge-wrapper-${key}`}>
        <ExplorerChartLabelBadge entity={entity} />
        {onSelectEntity !== undefined && showFilterIcons === true ? (
          <EntityFilter
            isEmbeddable={isEmbeddable}
            onFilter={applyFilter}
            influencerFieldName={entity.fieldName}
            influencerFieldValue={entity.fieldValue}
          />
        ) : (
          <>&nbsp;</>
        )}
      </Fragment>
    );
  });

  const infoIcon = (
    <span>
      <EuiIconTip
        css={{
          maxWidth: 'none',
        }}
        content={<ExplorerChartInfoTooltip {...infoTooltip} />}
        position="top"
        size="s"
      />
    </span>
  );

  const { euiTheme } = useEuiTheme();

  const badgesStyles = css({
    display: 'flex',
    alignItems: 'center',
    marginTop: euiTheme.size.xs,
  });

  return (
    <>
      <span>
        <span>
          {detectorLabel}
          {labelSeparator}
        </span>
        {wrapLabel && infoIcon}
        {!wrapLabel && (
          <>
            {entityFieldBadges} {infoIcon}
          </>
        )}
      </span>
      {wrapLabel && <span css={badgesStyles}>{entityFieldBadges}</span>}
    </>
  );
}
ExplorerChartLabel.propTypes = {
  detectorLabel: PropTypes.object.isRequired,
  isEmbeddable: PropTypes.bool,
  entityFields: PropTypes.arrayOf(ExplorerChartLabelBadge.propTypes.entity),
  infoTooltip: PropTypes.object.isRequired,
  wrapLabel: PropTypes.bool,
};
