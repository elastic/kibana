/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useCallback } from 'react';
import { EuiButtonIcon, EuiFlexGrid, EuiFlexItem, EuiTitle, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { InfraMetadata } from '../../../common/http_api';
import euiStyled from '../../../../../common/eui_styled_components';

interface Props {
  metadata?: InfraMetadata | null;
}

const FIELDS = [
  {
    field: 'cloud.instance.id',
    label: i18n.translate('xpack.infra.nodeDetails.labels.instanceId', {
      defaultMessage: 'Instance ID',
    }),
  },
  {
    field: 'cloud.provider',
    label: i18n.translate('xpack.infra.nodeDetails.labels.cloudProvider', {
      defaultMessage: 'Cloud Provider',
    }),
  },
  {
    field: 'host.os.name',
    label: i18n.translate('xpack.infra.nodeDetails.labels.operatinSystem', {
      defaultMessage: 'Operating System',
    }),
  },
  {
    field: 'host.os.kernel',
    label: i18n.translate('xpack.infra.nodeDetails.labels.kernelVersion', {
      defaultMessage: 'Kernel Version',
    }),
  },
  {
    field: 'host.hostname',
    label: i18n.translate('xpack.infra.nodeDetails.labels.hostname', {
      defaultMessage: 'Hostname',
    }),
  },
  {
    field: 'host.containerized',
    label: i18n.translate('xpack.infra.nodeDetails.labels.containerized', {
      defaultMessage: 'Containerized',
    }),
  },
  {
    field: 'cloud.project.id',
    label: i18n.translate('xpack.infra.nodeDetails.labels.projectId', {
      defaultMessage: 'Project ID',
    }),
  },
  {
    field: 'cloud.availability_zone',
    label: i18n.translate('xpack.infra.nodeDetails.labels.availabilityZone', {
      defaultMessage: 'Availability Zone',
    }),
  },
  {
    field: 'cloud.machine.type',
    label: i18n.translate('xpack.infra.nodeDetails.labels.machineType', {
      defaultMessage: 'Machine Type',
    }),
  },
  {
    field: 'cloud.instance.name',
    label: i18n.translate('xpack.infra.nodeDetails.labels.instanceName', {
      defaultMessage: 'Instance Name',
    }),
  },
];

const getLabelForField = (field: string) => {
  const fieldDef = FIELDS.find(f => f.field === field);
  if (!fieldDef) return field;
  return fieldDef.label;
};

const getValueForField = (metadata: InfraMetadata, field: string) => {
  const value = get(metadata.info, field, '--');
  if (field !== 'host.containerized') {
    return value;
  }
  return value !== '--'
    ? i18n.translate('xpack.infra.nodeDetails.yes', { defaultMessage: 'Yes' })
    : i18n.translate('xpack.infra.nodeDetails.no', { defaultMessage: 'No' });
};

export const NodeDetails = ({ metadata }: Props) => {
  const [isOpen, setControlState] = useState<boolean>(false);
  if (!metadata) {
    return null;
  }

  const handleClick = useCallback(() => (isOpen ? setControlState(false) : setControlState(true)), [
    isOpen,
  ]);

  return (
    <NodeDetailsContainer>
      <Controls>
        <EuiButtonIcon
          iconType={isOpen ? 'arrowDown' : 'arrowUp'}
          onClick={handleClick}
          aria-label={i18n.translate('xpack.infra.nodeDetails.labels.showMoreDetails', {
            defaultMessage: 'Show more details',
          })}
        />
      </Controls>
      <EuiFlexGrid columns={4} style={{ flexGrow: 1 }}>
        {FIELDS.slice(0, isOpen ? FIELDS.length : 4).map(({ field }) => (
          <EuiFlexItem key={field} style={{ minWidth: 0 }}>
            <EuiTitle size="xs">
              <h4>{getLabelForField(field)}</h4>
            </EuiTitle>
            <EuiText>{getValueForField(metadata, field)}</EuiText>
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    </NodeDetailsContainer>
  );
};

const NodeDetailsContainer = euiStyled.div`
border-top: 1px solid ${props => props.theme.eui.euiBorderColor};
border-bottom: 1px solid ${props => props.theme.eui.euiBorderColor};
padding: ${props => props.theme.eui.paddingSizes.m} 0;
margin-bottom: ${props => props.theme.eui.paddingSizes.m};
display: flex;
`;

const Controls = euiStyled.div`
flex-grow: 0;
margin-right: ${props => props.theme.eui.paddingSizes.m};
`;
