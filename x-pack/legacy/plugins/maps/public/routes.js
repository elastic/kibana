/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import routes from 'ui/routes';
import listingTemplate from './angular/listing_ng_wrapper.html';
import mapTemplate from './angular/map.html';
import {
  getSavedObjectsClient,
  getRecentlyAccessed,
  getDocTitle,
  getSaveCapabilities,
} from './kibana_services';

routes.enable();

routes
  .defaults(/.*/, {
    badge: uiCapabilities => {
      if (uiCapabilities.maps.save) {
        return undefined;
      }

      return {
        text: i18n.translate('xpack.maps.badge.readOnly.text', {
          defaultMessage: 'Read only',
        }),
        tooltip: i18n.translate('xpack.maps.badge.readOnly.tooltip', {
          defaultMessage: 'Unable to save maps',
        }),
        iconType: 'glasses',
      };
    },
  })
  .when('/', {
    template: listingTemplate,
    controller($scope, gisMapSavedObjectLoader, config) {
      $scope.listingLimit = config.get('savedObjects:listingLimit');
      $scope.find = search => {
        return gisMapSavedObjectLoader.find(search, $scope.listingLimit);
      };
      $scope.delete = ids => {
        return gisMapSavedObjectLoader.delete(ids);
      };
      $scope.readOnly = !getSaveCapabilities();
    },
    resolve: {
      hasMaps: function(kbnUrl) {
        getSavedObjectsClient()
          .find({ type: 'map', perPage: 1 })
          .then(resp => {
            // Do not show empty listing page, just redirect to a new map
            if (resp.savedObjects.length === 0) {
              kbnUrl.redirect('/map');
            }
            return true;
          });
      },
    },
  })
  .when('/map', {
    template: mapTemplate,
    controller: 'GisMapController',
    resolve: {
      map: function(gisMapSavedObjectLoader, redirectWhenMissing) {
        return gisMapSavedObjectLoader.get().catch(
          redirectWhenMissing({
            map: '/',
          })
        );
      },
    },
  })
  .when('/map/:id', {
    template: mapTemplate,
    controller: 'GisMapController',
    resolve: {
      map: function(gisMapSavedObjectLoader, redirectWhenMissing, $route) {
        const id = $route.current.params.id;
        return gisMapSavedObjectLoader
          .get(id)
          .then(savedMap => {
            getRecentlyAccessed().add(savedMap.getFullPath(), savedMap.title, id);
            getDocTitle().change(savedMap.title);
            return savedMap;
          })
          .catch(
            redirectWhenMissing({
              map: '/',
            })
          );
      },
    },
  })
  .otherwise({
    redirectTo: '/',
  });
