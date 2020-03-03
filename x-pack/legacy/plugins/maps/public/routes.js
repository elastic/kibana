/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { capabilities } from 'ui/capabilities';
import chrome from 'ui/chrome';
import routes from 'ui/routes';
import { docTitle } from 'ui/doc_title';
import listingTemplate from './angular/listing_ng_wrapper.html';
import mapTemplate from './angular/map.html';
import { npStart } from 'ui/new_platform';

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
      $scope.readOnly = !capabilities.get().maps.save;
    },
    resolve: {
      hasMaps: function(kbnUrl) {
        chrome
          .getSavedObjectsClient()
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
            npStart.core.chrome.recentlyAccessed.add(savedMap.getFullPath(), savedMap.title, id);
            docTitle.change(savedMap.title);
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
