/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { compose, withProps } from 'recompose';
// @ts-ignore Untyped local
import {
  getWorkpad,
  getRenderedWorkpad,
  getRenderedWorkpadExpressions,
} from '../../../../state/selectors/workpad';
// @ts-ignore Untyped local
import { notify } from '../../../../lib/notify';
// @ts-ignore Untyped local
import {
  downloadRenderedWorkpad,
  downloadRuntime,
  downloadZippedRuntime,
  // @ts-ignore Untyped local
} from '../../../../lib/download_workpad';
import { ShareWebsiteFlyout as Component, Props as ComponentProps } from './share_website_flyout';
import { State, CanvasWorkpad } from '../../../../../types';
import { CanvasRenderedWorkpad } from '../../../../../shareable_runtime/types';
// @ts-ignore Untyped local.
import { fetch, arrayBufferFetch } from '../../../../../common/lib/fetch';
import { API_ROUTE_SHAREABLE_ZIP } from '../../../../../common/lib/constants';
import { renderFunctionNames } from '../../../../../shareable_runtime/supported_renderers';

import { ComponentStrings } from '../../../../../i18n/components';
import { withKibana } from '../../../../../../../../../src/plugins/kibana_react/public/';
import { OnCloseFn } from '../workpad_export';
import { WithKibanaProps } from '../../../../index';
const { WorkpadHeaderWorkpadExport: strings } = ComponentStrings;

const getUnsupportedRenderers = (state: State) => {
  const renderers: string[] = [];
  const expressions = getRenderedWorkpadExpressions(state);
  expressions.forEach(expression => {
    if (!renderFunctionNames.includes(expression)) {
      renderers.push(expression);
    }
  });

  return renderers;
};

const mapStateToProps = (state: State) => ({
  renderedWorkpad: getRenderedWorkpad(state),
  unsupportedRenderers: getUnsupportedRenderers(state),
  workpad: getWorkpad(state),
});

interface Props {
  onClose: OnCloseFn;
  renderedWorkpad: CanvasRenderedWorkpad;
  unsupportedRenderers: string[];
  workpad: CanvasWorkpad;
}

export const ShareWebsiteFlyout = compose<ComponentProps, Pick<Props, 'onClose'>>(
  connect(mapStateToProps),
  withKibana,
  withProps(
    ({
      unsupportedRenderers,
      renderedWorkpad,
      onClose,
      workpad,
      kibana,
    }: Props & WithKibanaProps): ComponentProps => ({
      unsupportedRenderers,
      onClose,
      onCopy: () => {
        notify.info(strings.getCopyShareConfigMessage());
      },
      onDownload: type => {
        switch (type) {
          case 'share':
            downloadRenderedWorkpad(renderedWorkpad);
            return;
          case 'shareRuntime':
            downloadRuntime(kibana.services.http.basePath.get());
            return;
          case 'shareZip':
            const basePath = kibana.services.http.basePath.get();
            arrayBufferFetch
              .post(`${basePath}${API_ROUTE_SHAREABLE_ZIP}`, JSON.stringify(renderedWorkpad))
              .then(blob => downloadZippedRuntime(blob.data))
              .catch((err: Error) => {
                notify.error(err, { title: strings.getShareableZipErrorTitle(workpad.name) });
              });
            return;
          default:
            throw new Error(strings.getUnknownExportErrorMessage(type));
        }
      },
    })
  )
)(Component);
