/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import euiStyled from '../../../../../common/eui_styled_components';
import { nodesToWaffleMap } from '../../containers/waffle/nodes_to_wafflemap';
import {
  isWaffleMapGroupWithGroups,
  isWaffleMapGroupWithNodes,
} from '../../containers/waffle/type_guards';
import { InfraSnapshotNode, InfraNodeType, InfraTimerangeInput } from '../../graphql/types';
import { InfraWaffleMapBounds, InfraWaffleMapOptions } from '../../lib/lib';
import { AutoSizer } from '../auto_sizer';
import { GroupOfGroups } from './group_of_groups';
import { GroupOfNodes } from './group_of_nodes';
import { Legend } from './legend';
import { applyWaffleMapLayout } from './lib/apply_wafflemap_layout';

interface Props {
  nodes: InfraSnapshotNode[];
  nodeType: InfraNodeType;
  options: InfraWaffleMapOptions;
  formatter: (subject: string | number) => string;
  timeRange: InfraTimerangeInput;
  onFilter: (filter: string) => void;
  bounds: InfraWaffleMapBounds;
  dataBounds: InfraWaffleMapBounds;
}

export const Map: React.SFC<Props> = ({
  nodes,
  options,
  timeRange,
  onFilter,
  formatter,
  bounds,
  nodeType,
  dataBounds,
}) => {
  const map = nodesToWaffleMap(nodes);
  return (
    <AutoSizer content>
      {({ measureRef, content: { width = 0, height = 0 } }) => {
        const groupsWithLayout = applyWaffleMapLayout(map, width, height);
        return (
          <WaffleMapOuterContainer
            innerRef={(el: any) => measureRef(el)}
            data-test-subj="waffleMap"
          >
            <WaffleMapInnerContainer>
              {groupsWithLayout.map(group => {
                if (isWaffleMapGroupWithGroups(group)) {
                  return (
                    <GroupOfGroups
                      onDrilldown={onFilter}
                      key={group.id}
                      options={options}
                      group={group}
                      formatter={formatter}
                      bounds={bounds}
                      nodeType={nodeType}
                      timeRange={timeRange}
                    />
                  );
                }
                if (isWaffleMapGroupWithNodes(group)) {
                  return (
                    <GroupOfNodes
                      key={group.id}
                      options={options}
                      group={group}
                      onDrilldown={onFilter}
                      formatter={formatter}
                      isChild={false}
                      bounds={bounds}
                      nodeType={nodeType}
                      timeRange={timeRange}
                    />
                  );
                }
              })}
            </WaffleMapInnerContainer>
            <Legend
              formatter={formatter}
              bounds={bounds}
              dataBounds={dataBounds}
              legend={options.legend}
            />
          </WaffleMapOuterContainer>
        );
      }}
    </AutoSizer>
  );
};

const WaffleMapOuterContainer = euiStyled.div`
  flex: 1 0 0%;
  display: flex;
  justify-content: flex-start;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
`;

const WaffleMapInnerContainer = euiStyled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  align-content: flex-start;
  padding: 10px;
`;
