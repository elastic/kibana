/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { StaticIndexPattern } from 'ui/index_patterns';

import { FlowTargetNew } from '../../../graphql/types';
import { networkModel } from '../../../store';
import { ESTermQuery } from '../../../../common/typed_json';
import { NarrowDateRange } from '../../../components/ml/types';
import { GlobalTimeArgs } from '../../../containers/global_time';

interface QueryTabBodyProps {
  type: networkModel.NetworkType;
  filterQuery?: string | ESTermQuery;
}

export type DnsQueryTabBodyProps = QueryTabBodyProps & GlobalTimeArgs;

export type IPsQueryTabBodyProps = QueryTabBodyProps &
  GlobalTimeArgs & {
    indexPattern: StaticIndexPattern;
    flowTarget: FlowTargetNew;
  };

export type AnomaliesQueryTabBodyProps = QueryTabBodyProps &
  Pick<GlobalTimeArgs, 'to' | 'from' | 'isInitializing'> & {
    narrowDateRange: NarrowDateRange;
  };
