/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import routes from 'ui/routes';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import listingTemplate from '../../../../plugins/maps/public/angular/listing_ng_wrapper.html';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import mapTemplate from '../../../../plugins/maps/public/angular/map.html';
import {
  getSavedObjectsClient,
  getCoreChrome,
  getMapsCapabilities,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../plugins/maps/public/kibana_services';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { getMapsSavedObjectLoader } from '../../../../plugins/maps/public/angular/services/gis_map_saved_object_loader';

routes.enable();

routes
  .defaults(/.*/, {
    badge: () => {
      if (getMapsCapabilities().save) {
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
    controller($scope, config) {
      const gisMapSavedObjectLoader = getMapsSavedObjectLoader();
      $scope.listingLimit = config.get('savedObjects:listingLimit');
      $scope.find = search => {
        return gisMapSavedObjectLoader.find(search, $scope.listingLimit);
      };
      $scope.delete = ids => {
        return gisMapSavedObjectLoader.delete(ids);
      };
      $scope.readOnly = !getMapsCapabilities().save;
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
      map: function(redirectWhenMissing) {
        const gisMapSavedObjectLoader = getMapsSavedObjectLoader();
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
      map: function(redirectWhenMissing, $route) {
        const gisMapSavedObjectLoader = getMapsSavedObjectLoader();
        const id = $route.current.params.id;
        return gisMapSavedObjectLoader
          .get(id)
          .then(savedMap => {
            getCoreChrome().recentlyAccessed.add(savedMap.getFullPath(), savedMap.title, id);
            getCoreChrome().docTitle.change(savedMap.title);
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
