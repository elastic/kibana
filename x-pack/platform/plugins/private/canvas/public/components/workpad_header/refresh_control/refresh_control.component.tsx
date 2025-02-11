/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDispatch, useSelector } from 'react-redux';

// @ts-expect-error untyped local
import { fetchAllRenderables } from '../../../state/actions/elements';
import { getInFlight } from '../../../state/selectors/resolved_args';
import { ToolTipShortcut } from '../../tool_tip_shortcut';
import { useCanvasApi } from '../../hooks/use_canvas_api';

const strings = {
  getRefreshAriaLabel: () =>
    i18n.translate('xpack.canvas.workpadHeaderRefreshControlSettings.refreshAriaLabel', {
      defaultMessage: 'Refresh Elements',
    }),
  getRefreshTooltip: () =>
    i18n.translate('xpack.canvas.workpadHeaderRefreshControlSettings.refreshTooltip', {
      defaultMessage: 'Refresh data',
    }),
};

export const RefreshControl = () => {
  const dispatch = useDispatch();
  const inFlight = useSelector(getInFlight);
  const canvasApi = useCanvasApi();
  const doRefresh = useCallback(() => {
    canvasApi.reload();
    dispatch(fetchAllRenderables());
  }, [canvasApi, dispatch]);

  return (
    <EuiToolTip
      position="bottom"
      content={
        <span>
          {strings.getRefreshTooltip()}
          <ToolTipShortcut namespace="EDITOR" action="REFRESH" />
        </span>
      }
    >
      <EuiButtonIcon
        disabled={inFlight}
        iconType="refresh"
        aria-label={strings.getRefreshAriaLabel()}
        onClick={doRefresh}
        data-test-subj="canvas-refresh-control"
      />
    </EuiToolTip>
  );
};

RefreshControl.propTypes = {
  doRefresh: PropTypes.func.isRequired,
  inFlight: PropTypes.bool,
};
