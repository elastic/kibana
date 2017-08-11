import 'babel-polyfill';
import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import {
  Router,
  useRouterHistory,
} from 'react-router';
import { syncHistoryWithStore } from 'react-router-redux';
import createHashHistory from 'history/lib/createHashHistory';

// Store.
import configureStore from './store/configure_store';

// Guide views.
import AppContainer from './views/app_container';
import { HomeView } from './views/home/home_view';
import { NotFoundView } from './views/not_found/not_found_view';

import {
  Routes,
  registerTheme,
} from './services';

// Set up themes

import themeLight from '!style/useable!css!postcss!sass!./theme_light.scss';
import uiFrameworkThemeLight from '!style/useable!css!../../dist/ui_framework_theme_light.css';

registerTheme('light', [
  themeLight,
  uiFrameworkThemeLight,
]);

import themeDark from '!style/useable!css!postcss!sass!./theme_dark.scss';
import uiFrameworkThemeDark from '!style/useable!css!../../dist/ui_framework_theme_dark.css';

registerTheme('dark', [
  themeDark,
  uiFrameworkThemeDark,
]);

// Set up app

const store = configureStore();
const browserHistory = useRouterHistory(createHashHistory)({
  queryKey: false,
});
const history = syncHistoryWithStore(browserHistory, store);

const childRoutes = [].concat(Routes.getAppRoutes());
childRoutes.push({
  path: '*',
  component: NotFoundView,
  name: 'Page Not Found',
});

const routes = [{
  path: '/',
  component: AppContainer,
  indexRoute: {
    component: HomeView,
    source: 'views/home/HomeView',
  },
  childRoutes,
}];

// Update document title with route name.
const onRouteEnter = route => {
  const leafRoute = route.routes[route.routes.length - 1];
  document.title = leafRoute.name ?
    `Kibana UI Framework - ${leafRoute.name}` :
    'Kibana UI Framework';
};

const syncTitleWithRoutes = routesList => {
  if (!routesList) return;
  routesList.forEach(route => {
    route.onEnter = onRouteEnter; // eslint-disable-line no-param-reassign
    if (route.indexRoute) {
      // Index routes have a weird relationship with their "parent" routes,
      // so it seems we need to give their own onEnter hooks.
      route.indexRoute.onEnter = onRouteEnter; // eslint-disable-line no-param-reassign
    }
    syncTitleWithRoutes(route.childRoutes);
  });
};

syncTitleWithRoutes(routes);

ReactDOM.render(
  <Provider store={store}>
    <Router
      history={history}
      routes={routes}
    />
  </Provider>,
  document.getElementById('guide')
);
