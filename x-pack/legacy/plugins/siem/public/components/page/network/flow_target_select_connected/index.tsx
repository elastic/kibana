/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import styled from 'styled-components';

import { FlowDirection } from '../../../../graphql/types';
import { State } from '../../../../store';
import { networkActions, networkSelectors } from '../../../../store/network';
import * as i18nIp from '../ip_overview/translations';

import { FlowTargetSelect } from '../../../flow_controls/flow_target_select';
import { IpOverviewId } from '../../../field_renderers/field_renderers';

const SelectTypeItem = styled(EuiFlexItem)`
  min-width: 180px;
`;

SelectTypeItem.displayName = 'SelectTypeItem';

type FlowTargetSelectProps = FlowTargetSelectReduxProps;

const FlowTargetSelectComponent = React.memo<FlowTargetSelectProps>(
  ({ flowTarget, updateIpDetailsFlowTarget }) => (
    <SelectTypeItem grow={false} data-test-subj={`${IpOverviewId}-select-flow-target`}>
      <FlowTargetSelect
        id={IpOverviewId}
        isLoading={!flowTarget}
        selectedDirection={FlowDirection.uniDirectional}
        selectedTarget={flowTarget}
        displayTextOverride={[i18nIp.AS_SOURCE, i18nIp.AS_DESTINATION]}
        updateFlowTargetAction={updateIpDetailsFlowTarget}
      />
    </SelectTypeItem>
  )
);

FlowTargetSelectComponent.displayName = 'FlowTargetSelectComponent';

const makeMapStateToProps = () => {
  const getIpDetailsFlowTargetSelector = networkSelectors.ipDetailsFlowTargetSelector();
  return (state: State) => {
    return {
      flowTarget: getIpDetailsFlowTargetSelector(state),
    };
  };
};

const connector = connect(makeMapStateToProps, {
  updateIpDetailsFlowTarget: networkActions.updateIpDetailsFlowTarget,
});

type FlowTargetSelectReduxProps = ConnectedProps<typeof connector>;

export const FlowTargetSelectConnected = connector(FlowTargetSelectComponent);
