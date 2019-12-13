/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import uuid from 'uuid/v4';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiTitle,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';

import { Join } from './resources/join';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

export function JoinEditor({ joins, layer, onChange }) {

  const renderJoins = () => {
    return joins.map((joinDescriptor, index) => {
      const handleOnChange = (updatedDescriptor) => {
        onChange(layer, [
          ...joins.slice(0, index),
          updatedDescriptor,
          ...joins.slice(index + 1)
        ]);
      };

      const handleOnRemove = () => {
        onChange(layer, [
          ...joins.slice(0, index),
          ...joins.slice(index + 1)
        ]);
      };

      return (
        <Fragment key={index}>
          <EuiSpacer size="m" />
          <Join
            join={joinDescriptor}
            layer={layer}
            onChange={handleOnChange}
            onRemove={handleOnRemove}
          />
        </Fragment>
      );
    });
  };

  const addJoin = () => {
    onChange(layer, [
      ...joins,
      {
        right: {
          id: uuid(),
          applyGlobalQuery: true,
        }
      }
    ]);
  };

  if (!layer.isJoinable()) {
    return null;
  }

  return (
    <div>
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h5>
              <EuiToolTip
                content={i18n.translate('xpack.maps.layerPanel.joinEditor.termJoinTooltip', {
                  defaultMessage: 'Use term joins to augment this layer with properties for data driven styling.'
                })}
              >
                <FormattedMessage
                  id="xpack.maps.layerPanel.joinEditor.termJoinsTitle"
                  defaultMessage="Term joins"
                />
              </EuiToolTip>
            </h5>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>

          <EuiButtonIcon
            iconType="plusInCircle"
            onClick={addJoin}
            aria-label={i18n.translate('xpack.maps.layerPanel.joinEditor.addJoinAriaLabel', {
              defaultMessage: 'Add join'
            })
            }
            title={
              i18n.translate('xpack.maps.layerPanel.joinEditor.addJoinButtonLabel', {
                defaultMessage: 'Add join'
              })
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {renderJoins()}
    </div>
  );
}
