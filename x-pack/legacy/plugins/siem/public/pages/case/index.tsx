/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { Route, Switch, RouteComponentProps } from 'react-router-dom';
import { SiemPageName } from '../home/types';
import { CaseDetailsPage } from './case_details';
import { CasesPage } from './case';
import { CreateCasePage } from './create_case';

type Props = Partial<RouteComponentProps<{}>> & { url: string };

const casesPagePath = `/:pageName(${SiemPageName.case})`;
const caseDetailsPagePath = `${casesPagePath}/:detailName`;
const createCasePagePath = `${casesPagePath}/create`;

const CaseContainerComponent: React.FC<Props> = () => {
  return (
    <Switch>
      <Route strict exact path={casesPagePath} render={() => <CasesPage />} />
      <Route strict exact path={createCasePagePath} render={() => <CreateCasePage />} />
      <Route
        strict
        path={caseDetailsPagePath}
        render={({
          match: {
            params: { detailName },
          },
        }) => <CaseDetailsPage caseId={detailName} />}
      />
    </Switch>
  );
};

export const Case = React.memo(CaseContainerComponent);
