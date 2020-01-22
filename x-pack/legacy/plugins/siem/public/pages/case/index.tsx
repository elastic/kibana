/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { Route, Switch, RouteComponentProps } from 'react-router-dom';
import { SiemPageName } from '../home/types';
import { CasePage } from './case';
import { CaseDetails } from './case_details';

type Props = Partial<RouteComponentProps<{}>> & { url: string };

const casesPagePath = `/:pageName(${SiemPageName.case})`;
const caseDetailsPagePath = `${casesPagePath}/:detailName`;

const CaseContainerComponent: React.FC<Props> = () => {
  return (
    <Switch>
      <Route strict exact path={casesPagePath} render={() => <CasePage />} />
      <Route
        strict
        path={caseDetailsPagePath}
        render={({
          match: {
            params: { detailName },
          },
        }) => <CaseDetails caseId={detailName} />}
      />
    </Switch>
  );
};

export const Case = React.memo(CaseContainerComponent);
Case.displayName = 'Case';
