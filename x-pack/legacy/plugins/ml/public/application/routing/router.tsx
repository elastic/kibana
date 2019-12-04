/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, RouteProps } from 'react-router-dom';
import { Location } from 'history';
import { I18nContext } from 'ui/i18n';
import { SavedSearch } from 'src/legacy/core_plugins/kibana/public/discover/types';

import { IndexPatterns } from 'ui/index_patterns';
import { getIndexPatternById, getFullIndexPatterns } from '../util/index_utils';
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
  basename: string;
  config: KibanaConfigTypeFix;
  setBreadCrumbs: any;
  indexPatterns: IndexPatterns;
}> = ({ basename, config, setBreadCrumbs, indexPatterns }) => {
  return (
    <Router basename={basename}>
      <div>
        {Object.entries(routes).map(([name, route]) => (
          <Route
            key={name}
            path={route.path}
            exact
            render={props => {
              setBreadCrumbs(route.breadcrumbs);
              return route.render(props, config, { indexPatterns });
            }}
          />
        ))}
      </div>
    </Router>
  );
};

export const useResolver = (
  index: string | undefined,
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
