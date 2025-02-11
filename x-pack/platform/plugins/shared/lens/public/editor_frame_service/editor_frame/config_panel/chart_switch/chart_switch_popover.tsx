/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './chart_switch.scss';
import React, { useState, memo } from 'react';
import { EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ChartSwitchTrigger } from '@kbn/visualization-ui-components';
import { useLensSelector, selectVisualization } from '../../../../state_management';
import { ChartSwitch, ChartSwitchProps } from './chart_switch';

export const ChartSwitchPopover = memo(function ChartSwitchPopover(
  props: Omit<ChartSwitchProps, 'onChartSelect'>
) {
  const [flyoutOpen, setFlyoutOpen] = useState<boolean>(false);
  const visualization = useLensSelector(selectVisualization);

  const { icon, label } = (visualization.activeId &&
    props.visualizationMap[visualization.activeId]?.getDescription(
      visualization.state,
      props.layerId
    )) || {
    label: i18n.translate('xpack.lens.configPanel.selectVisualization', {
      defaultMessage: 'Select a visualization',
    }),
    icon: undefined,
  };

  return (
    <div className="lnsChartSwitch__header">
      <EuiPopover
        id="lnsChartSwitchPopover"
        ownFocus
        initialFocus=".lnsChartSwitch__popoverPanel"
        panelClassName="lnsChartSwitch__popoverPanel"
        panelPaddingSize="none"
        repositionOnScroll
        button={
          <ChartSwitchTrigger
            icon={icon}
            label={label}
            dataTestSubj="lnsChartSwitchPopover"
            onClick={() => setFlyoutOpen(!flyoutOpen)}
          />
        }
        isOpen={flyoutOpen}
        closePopover={() => setFlyoutOpen(false)}
        anchorPosition="downLeft"
      >
        {flyoutOpen ? <ChartSwitch {...props} onChartSelect={() => setFlyoutOpen(false)} /> : null}
      </EuiPopover>
    </div>
  );
});
