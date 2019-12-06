/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useState } from 'react';
import { HashRouter, Route, RouteProps } from 'react-router-dom';
import { Location } from 'history';
import { I18nContext } from 'ui/i18n';

import { IndexPatterns } from 'ui/index_patterns';
import {
  getIndexPatternById,
  getIndexPatternsContract,
  getIndexPatternAndSavedSearch,
} from '../util/index_utils';
import { createSearchItems } from '../jobs/new_job/utils/new_job_utils';
import { ResolverResults, Resolvers } from './resolvers';
import { KibanaContext, KibanaConfigTypeFix, KibanaContextValue } from '../contexts/kibana';
import { ChromeBreadcrumb } from '../../../../../../../src/core/public';

import * as routes from './routes';

// custom RouteProps making location non-optional
interface MlRouteProps extends RouteProps {
  location: Location;
}

export interface MlRoute {
  path: string;
  render(props: MlRouteProps, config: KibanaConfigTypeFix, deps: PageDependencies): JSX.Element;
  breadcrumbs: ChromeBreadcrumb[];
}

export interface PageProps {
  location: Location;
  config: KibanaConfigTypeFix;
  deps: PageDependencies;
}

export interface PageDependencies {
  indexPatterns: IndexPatterns;
}

export const PageLoader: FC<{ context: KibanaContextValue }> = ({ context, children }) => {
  return context === null ? null : (
    <I18nContext>
      <KibanaContext.Provider value={context}>{children}</KibanaContext.Provider>
    </I18nContext>
  );
};

export const MlRouter: FC<{
  config: KibanaConfigTypeFix;
  setBreadCrumbs: any;
  indexPatterns: IndexPatterns;
}> = ({ config, setBreadCrumbs, indexPatterns }) => {
  return (
    <HashRouter>
      <div>
        {Object.entries(routes).map(([name, route]) => (
          <Route
            key={name}
            path={route.path}
            exact
            render={props => {
              window.setTimeout(() => {
                setBreadCrumbs(route.breadcrumbs);
              });
              return route.render(props, config, { indexPatterns });
            }}
          />
        ))}
      </div>
    </HashRouter>
  );
};

export const useResolver = (
  indexPatternId: string | undefined,
  savedSearchId: string | undefined,
  config: KibanaConfigTypeFix,
  resolvers: Resolvers
): { context: KibanaContextValue; results: ResolverResults } => {
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

        if (indexPatternId !== undefined || savedSearchId !== undefined) {
          const { indexPattern, savedSearch } =
            savedSearchId !== undefined
              ? await getIndexPatternAndSavedSearch(savedSearchId)
              : { savedSearch: null, indexPattern: await getIndexPatternById(indexPatternId!) };

          const { combinedQuery } = createSearchItems(config, indexPattern!, savedSearch);

          setContext({
            combinedQuery,
            currentIndexPattern: indexPattern,
            currentSavedSearch: savedSearch,
            indexPatterns: getIndexPatternsContract()!,
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
