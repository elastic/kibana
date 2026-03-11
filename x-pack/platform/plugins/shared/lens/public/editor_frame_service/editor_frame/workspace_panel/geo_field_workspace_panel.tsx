/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { VISUALIZE_GEO_FIELD_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { GlobeIllustration } from '@kbn/chart-icons';
import { Droppable } from '@kbn/dom-drag-drop';
import type { IndexPattern } from '@kbn/lens-common';
import { getVisualizeGeoFieldMessage } from '../../../utils';
import { APP_ID } from '../../../../common/constants';
import { pageContentBodyStyles, promptIllustrationStyle } from './workspace_panel';

interface Props {
  fieldType: string;
  fieldName: string;
  indexPattern: IndexPattern;
  uiActions: UiActionsStart;
}

const dragDropIdentifier = {
  id: 'lnsGeoFieldWorkspace',
  humanData: {
    label: i18n.translate('xpack.lens.geoFieldWorkspace.dropZoneLabel', {
      defaultMessage: 'drop zone to open in maps',
    }),
  },
};

const dragDropOrder = [1, 0, 0, 0];

export function GeoFieldWorkspacePanel(props: Props) {
  function onDrop() {
    props.uiActions.executeTriggerActions(VISUALIZE_GEO_FIELD_TRIGGER, {
      dataViewSpec: props.indexPattern.spec,
      fieldName: props.fieldName,
      originatingApp: APP_ID,
    });
  }

  return (
    <div className="eui-scrollBar" css={pageContentBodyStyles}>
      <EuiText textAlign="center" size="s">
        <div>
          <h2>
            <strong>{getVisualizeGeoFieldMessage(props.fieldType)}</strong>
          </h2>
          <GlobeIllustration aria-hidden={true} css={promptIllustrationStyle} />
          <Droppable
            css={droppableStyles}
            dataTestSubj="lnsGeoFieldWorkspace"
            dropTypes={['field_add']}
            order={dragDropOrder}
            value={dragDropIdentifier}
            onDrop={onDrop}
          >
            <p>
              <strong>
                <FormattedMessage
                  id="xpack.lens.geoFieldWorkspace.dropMessage"
                  defaultMessage="Drop field here to open in Maps"
                />
              </strong>
            </p>
          </Droppable>
        </div>
      </EuiText>
    </div>
  );
}

const droppableStyles = ({ euiTheme }: UseEuiTheme) => {
  return `
    padding: ${euiTheme.size.xxl} ${euiTheme.size.xxxl};
    border: ${euiTheme.border.thin};
    border-radius: ${euiTheme.border.radius};
  `;
};
