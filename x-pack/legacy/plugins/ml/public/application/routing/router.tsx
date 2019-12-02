/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useState } from 'react';
import { BrowserRouter as Router, Route } from 'react-router-dom';
import { I18nContext } from 'ui/i18n';
import { SavedSearch } from 'src/legacy/core_plugins/kibana/public/discover/types';

import { getIndexPatternById, getFullIndexPatterns } from '../util/index_utils';
import { createSearchItems } from '../jobs/new_job/utils/new_job_utils';
import { ResolverResults, Resolvers } from './resolvers';
import { KibanaContext, KibanaConfigTypeFix } from '../contexts/kibana';

import * as routes from './routes';

export interface MlRoute {
  path: string;
  render(props: any, config: any): JSX.Element;
}

export const PageLoader: FC<{ context: any }> = ({ context, children }) => {
  return context === null ? null : (
    <I18nContext>
      <KibanaContext.Provider value={context}>{children}</KibanaContext.Provider>
    </I18nContext>
  );
};

export const MlRouter: FC<{ basename: string; config: KibanaConfigTypeFix }> = ({
  basename,
  config,
}) => {
  return (
    <Router basename={basename}>
      <div>
        {Object.entries(routes).map(([name, route]) => (
          <Route key={name} path={route.path} exact render={props => route.render(props, config)} />
        ))}
      </div>
    </Router>
  );
};

export const useResolver = (
  index: string | undefined,
  config: KibanaConfigTypeFix,
  resolvers: Resolvers
) => {
  const funcNames = Object.keys(resolvers); // Object.entries gets this wrong?!
  const funcs = Object.values(resolvers); // Object.entries gets this wrong?!
  const tempResults = funcNames.reduce((p, c) => {
    p[c] = {};
    return p;
  }, {} as ResolverResults);

  const [context, setContext] = useState<any | null>(null);
  const [results, setResults] = useState(tempResults);

  useEffect(() => {
    (async () => {
      try {
        const res = await Promise.all(funcs.map(r => r()));
        res.forEach((r, i) => (tempResults[funcNames[i]] = r));
        setResults(tempResults);

        const stubbedSavedSearch = ({
          searchSource: {
            getField() {},
          },
        } as never) as SavedSearch;

        if (index !== undefined) {
          const { indexPattern, savedSearch, combinedQuery } = createSearchItems(
            config,
            await getIndexPatternById(index),
            stubbedSavedSearch
          );

          setContext({
            combinedQuery,
            currentIndexPattern: indexPattern,
            currentSavedSearch: savedSearch,
            indexPatterns: getFullIndexPatterns()!,
            kibanaConfig: config,
          });
        } else {
          setContext({});
        }
      } catch (error) {
        // quietly fail. Let the resolvers handle the redirection if any fail to resolve
        // eslint-disable-next-line no-console
        console.error(error);
      }
    })();
  }, []);

  return { context, results };
};
