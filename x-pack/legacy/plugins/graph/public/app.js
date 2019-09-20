/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import d3 from 'd3';
import { i18n } from '@kbn/i18n';
import 'ace';
import rison from 'rison-node';
import React from 'react';

// import the uiExports that we want to "use"
import 'uiExports/fieldFormats';
import 'uiExports/savedObjectTypes';

import 'ui/autoload/all';
// TODO: remove ui imports completely (move tDelete o plugins)
import 'ui/kbn_top_nav';
import 'ui/directives/saved_object_finder';
import 'ui/directives/input_focus';
import 'ui/saved_objects/ui/saved_object_save_as_checkbox';
import chrome from 'ui/chrome';
import { uiModules } from 'ui/modules';
import uiRoutes from 'ui/routes';
import { addAppRedirectMessageToUrl, fatalError, toastNotifications } from 'ui/notify';
import { formatAngularHttpError } from 'ui/notify/lib';
import { setup as data } from '../../../../../src/legacy/core_plugins/data/public/legacy';
import { SavedObjectsClientProvider } from 'ui/saved_objects';
import { KibanaParsedUrl } from 'ui/url/kibana_parsed_url';
import { npStart } from 'ui/new_platform';
import { SavedObjectRegistryProvider } from 'ui/saved_objects/saved_object_registry';
import { capabilities } from 'ui/capabilities';
import { showSaveModal } from 'ui/saved_objects/show_saved_object_save_modal';

import { xpackInfo } from 'plugins/xpack_main/services/xpack_info';

import appTemplate from './angular/templates/index.html';
import listingTemplate from './angular/templates/listing_ng_wrapper.html';
import { getReadonlyBadge } from './badge';
import { FormattedMessage } from '@kbn/i18n/react';

import { GraphApp } from './components/app';
import { VennDiagram } from './components/venn_diagram';
import { Listing } from './components/listing';
import { Settings } from './components/settings';

import gws from './angular/graph_client_workspace.js';
import { SavedWorkspacesProvider } from './angular/services/saved_workspaces';
import { getEditUrl, getNewPath, getEditPath, setBreadcrumbs, getHomePath } from './services/url';
import { openSourceModal } from './services/source_modal';
import { urlTemplateRegex } from  './helpers/url_template';
import {
  asAngularSyncedObservable,
} from './helpers/as_observable';
import {
  createGraphStore,
  selectedFieldsSelector,
  datasourceSelector,
  requestDatasource,
} from './state_management';

import './angular/directives/graph_inspect';

const app = uiModules.get('app/graph');

function checkLicense(Promise, kbnBaseUrl) {
  const licenseAllowsToShowThisPage = xpackInfo.get('features.graph.showAppLink') &&
    xpackInfo.get('features.graph.enableAppLink');
  if (!licenseAllowsToShowThisPage) {
    const message = xpackInfo.get('features.graph.message');
    const newUrl = addAppRedirectMessageToUrl(chrome.addBasePath(kbnBaseUrl), message);
    window.location.href = newUrl;
    return Promise.halt();
  }

  return Promise.resolve();
}

app.directive('focusOn', function () {
  return function (scope, elem, attr) {
    scope.$on(attr.focusOn, function () {
      elem[0].focus();
    });
  };
});

app.directive('vennDiagram', function (reactDirective) {
  return reactDirective(VennDiagram);
});

app.directive('graphListing', function (reactDirective) {
  return reactDirective(Listing);
});

app.directive('graphApp', function (reactDirective) {
  return reactDirective(GraphApp, [
    ['store', { watchDepth: 'reference' }],
    ['currentIndexPattern', { watchDepth: 'reference' }],
    ['isLoading', { watchDepth: 'reference' }],
    ['onIndexPatternSelected', { watchDepth: 'reference' }],
    ['onQuerySubmit', { watchDepth: 'reference' }],
    ['savedObjects', { watchDepth: 'reference' }],
    ['uiSettings', { watchDepth: 'reference' }],
    ['overlays', { watchDepth: 'reference' }]
  ]);
});

if (uiRoutes.enable) {
  uiRoutes.enable();
}

uiRoutes
  .when('/home', {
    template: listingTemplate,
    badge: getReadonlyBadge,
    controller($injector, $location, $scope, Private, config, Promise, kbnBaseUrl) {
      checkLicense(Promise, kbnBaseUrl);
      const services = Private(SavedObjectRegistryProvider).byLoaderPropertiesName;
      const graphService = services['Graph workspace'];
      const kbnUrl = $injector.get('kbnUrl');

      $scope.listingLimit = config.get('savedObjects:listingLimit');
      $scope.create = () => {
        kbnUrl.redirect(getNewPath());
      };
      $scope.find = (search) => {
        return graphService.find(search, $scope.listingLimit);
      };
      $scope.editItem = (workspace) => {
        kbnUrl.redirect(getEditPath(workspace));
      };
      $scope.getViewUrl = (workspace) => getEditUrl(chrome, workspace);
      $scope.delete = (workspaces) => {
        return graphService.delete(workspaces.map(({ id }) => id));
      };
      $scope.capabilities = capabilities.get().graph;
      $scope.initialFilter = ($location.search()).filter || '';
      setBreadcrumbs({ chrome });
    }
  })
  .when('/workspace/:id?', {
    template: appTemplate,
    badge: getReadonlyBadge,
    resolve: {
      savedWorkspace: function (savedGraphWorkspaces, $route) {
        return $route.current.params.id ? savedGraphWorkspaces.get($route.current.params.id)
          .catch(
            function () {
              toastNotifications.addDanger(
                i18n.translate('xpack.graph.missingWorkspaceErrorMessage', {
                  defaultMessage: 'Missing workspace',
                })
              );
            }
          ) : savedGraphWorkspaces.get();
      },
      //Copied from example found in wizard.js ( Kibana TODO - can't
      indexPatterns: function (Private) {
        const savedObjectsClient = Private(SavedObjectsClientProvider);

        return savedObjectsClient.find({
          type: 'index-pattern',
          fields: ['title', 'type'],
          perPage: 10000
        }).then(response => response.savedObjects);
      },
      GetIndexPatternProvider: function (Private) {
        return data.indexPatterns.indexPatterns;
      },
      SavedWorkspacesProvider: function (Private) {
        return Private(SavedWorkspacesProvider);
      }
    }
  })
  .otherwise({
    redirectTo: '/home'
  });


//========  Controller for basic UI ==================
app.controller('graphuiPlugin', function (
  $scope,
  $route,
  $http,
  kbnUrl,
  Promise,
  confirmModal,
  kbnBaseUrl
) {
  function handleSuccess(data) {
    return checkLicense(Promise, kbnBaseUrl)
      .then(() => data);
  }

  function handleError(err) {
    return checkLicense(Promise, kbnBaseUrl)
      .then(() => {
        const toastTitle = i18n.translate('xpack.graph.errorToastTitle', {
          defaultMessage: 'Graph Error',
          description: '"Graph" is a product name and should not be translated.',
        });
        if (err instanceof Error) {
          toastNotifications.addError(err, {
            title: toastTitle,
          });
        } else {
          toastNotifications.addDanger({
            title: toastTitle,
            text: String(err),
          });
        }
      });
  }

  function handleHttpError(error) {
    return checkLicense(Promise, kbnBaseUrl)
      .then(() => {
        toastNotifications.addDanger(formatAngularHttpError(error));
      });
  }

  function updateBreadcrumbs() {
    setBreadcrumbs({
      chrome,
      savedWorkspace: $route.current.locals.savedWorkspace,
      navigateTo: () => {
        // TODO this should be wrapped into canWipeWorkspace,
        // but the check is too simple right now. Change this
        // once actual state-diffing is in place.
        $scope.$evalAsync(() => {
          kbnUrl.changePath(getHomePath());
        });
      }
    });
  }

  // Replacement function for graphClientWorkspace's comms so
  // that it works with Kibana.
  function callNodeProxy(indexName, query, responseHandler) {
    const request = {
      index: indexName,
      query: query
    };
    $scope.loading = true;
    return $http.post('../api/graph/graphExplore', request)
      .then(function (resp) {
        if (resp.data.resp.timed_out) {
          toastNotifications.addWarning(
            i18n.translate('xpack.graph.exploreGraph.timedOutWarningText', {
              defaultMessage: 'Exploration timed out',
            })
          );
        }
        responseHandler(resp.data.resp);
      })
      .catch(handleHttpError)
      .finally(() => {
        $scope.loading = false;
      });
  }


  //Helper function for the graphClientWorkspace to perform a query
  const callSearchNodeProxy = function (indexName, query, responseHandler) {
    const request = {
      index: indexName,
      body: query
    };
    $scope.loading = true;
    $http.post('../api/graph/searchProxy', request)
      .then(function (resp) {
        responseHandler(resp.data.resp);
      })
      .catch(handleHttpError)
      .finally(() => {
        $scope.loading = false;
      });
  };

  const store = createGraphStore({
    basePath: chrome.getBasePath(),
    indexPatternProvider: $route.current.locals.GetIndexPatternProvider,
    indexPatterns: $route.current.locals.indexPatterns,
    createWorkspace: (indexPattern) => {
      const options = {
        indexName: indexPattern,
        vertex_fields: [],
        // Here we have the opportunity to look up labels for nodes...
        nodeLabeller: function () {
          //   console.log(newNodes);
        },
        changeHandler: function () {
          //Allows DOM to update with graph layout changes.
          $scope.$apply();
        },
        graphExploreProxy: callNodeProxy,
        searchProxy: callSearchNodeProxy,
        exploreControls: {
          useSignificance: true,
          sampleSize: 2000,
          timeoutMillis: 5000,
          sampleDiversityField: null,
          maxValuesPerDoc: 1,
          minDocCount: 3
        }
      };
      $scope.workspace = gws.createWorkspace(options);
    },
    getWorkspace: () => {
      return $scope.workspace;
    },
    getSavedWorkspace: () => {
      return $route.current.locals.savedWorkspace;
    },
    notifications: npStart.core.notifications,
    showSaveModal,
    savePolicy: chrome.getInjected('graphSavePolicy'),
    changeUrl: (newUrl) => {
      $scope.$evalAsync(() => {
        kbnUrl.change(newUrl, {});
      });
    },
    notifyAngular: () => {
      $scope.$digest();
    }
  });

  $scope.spymode = 'request';

  const allSavingDisabled = chrome.getInjected('graphSavePolicy') === 'none';

  $scope.reduxStore = store;
  $scope.pluginDependencies = npStart.core;
  $scope.loading = false;
  $scope.pluginDependencies = npStart.core;

  $scope.nodeClick = function (n, $event) {

    //Selection logic - shift key+click helps selects multiple nodes
    // Without the shift key we deselect all prior selections (perhaps not
    // a great idea for touch devices with no concept of shift key)
    if (!$event.shiftKey) {
      const prevSelection = n.isSelected;
      $scope.workspace.selectNone();
      n.isSelected = prevSelection;
    }


    if ($scope.workspace.toggleNodeSelection(n)) {
      $scope.selectSelected(n);
    } else {
      $scope.detail = null;
    }
  };

  function canWipeWorkspace(yesFn, noFn) {
    if (selectedFieldsSelector(store.getState()).length === 0 && $scope.workspace === null) {
      yesFn();
      return;
    }
    const confirmModalOptions = {
      onConfirm: yesFn,
      onCancel: noFn || (() => {}),
      confirmButtonText: i18n.translate('xpack.graph.clearWorkspace.confirmButtonLabel', {
        defaultMessage: 'Continue',
      }),
      title: i18n.translate('xpack.graph.clearWorkspace.modalTitle', {
        defaultMessage: 'Discard changes to workspace?',
      }),
    };
    confirmModal(i18n.translate('xpack.graph.clearWorkspace.confirmText', {
      defaultMessage: 'Once you discard changes made to a workspace, there is no getting them back.',
    }), confirmModalOptions);
  }

  $scope.uiSelectIndex = function (proposedIndex) {
    canWipeWorkspace(function () {
      $scope.indexSelected(proposedIndex);
    });
  };


  $scope.clickEdge = function (edge) {
    if (edge.inferred) {
      $scope.setDetail ({ 'inferredEdge': edge });
    }else {
      $scope.workspace.getAllIntersections($scope.handleMergeCandidatesCallback, [edge.topSrc, edge.topTarget]);
    }
  };


  $scope.submit = function (searchTerm) {
    const numHops = 2;
    if (searchTerm.startsWith('{')) {
      try {
        const query = JSON.parse(searchTerm);
        if (query.vertices) {
          // Is a graph explore request
          $scope.workspace.callElasticsearch(query);
        }else {
          // Is a regular query DSL query
          $scope.workspace.search(query, $scope.liveResponseFields, numHops);
        }
      }
      catch (err) {
        handleError(err);
      }
      return;
    }
    $scope.workspace.simpleSearch(searchTerm, $scope.liveResponseFields, numHops);
  };

  $scope.clearWorkspace = function () {
    $scope.workspace = null;
    $scope.detail = null;
    if ($scope.closeMenus) $scope.closeMenus();
  };


  $scope.selectSelected = function (node) {
    $scope.detail = {
      latestNodeSelection: node
    };
    return $scope.selectedSelectedVertex = node;
  };

  $scope.isSelectedSelected = function (node) {
    return $scope.selectedSelectedVertex === node;
  };

  $scope.openUrlTemplate = function (template) {
    const url = template.url;
    const newUrl = url.replace(urlTemplateRegex, template.encoder.encode($scope.workspace));
    window.open(newUrl, '_blank');
  };

  $scope.setDetail = function (data) {
    $scope.detail = data;
  };

  $scope.performMerge = function (parentId, childId) {
    let found = true;
    while (found) {
      found = false;
      for (const i in $scope.detail.mergeCandidates) {
        const mc = $scope.detail.mergeCandidates[i];
        if ((mc.id1 === childId) || (mc.id2 === childId)) {
          $scope.detail.mergeCandidates.splice(i, 1);
          found = true;
          break;
        }
      }
    }
    $scope.workspace.mergeIds(parentId, childId);
    $scope.detail = null;
  };


  $scope.handleMergeCandidatesCallback = function (termIntersects) {
    const mergeCandidates = [];
    for (const i in termIntersects) {
      const ti = termIntersects[i];
      mergeCandidates.push({
        'id1': ti.id1,
        'id2': ti.id2,
        'term1': ti.term1,
        'term2': ti.term2,
        'v1': ti.v1,
        'v2': ti.v2,
        'overlap': ti.overlap
      });

    }
    $scope.detail = { mergeCandidates };
  };

  // Zoom functions for the SVG-based graph
  const redraw = function () {
    d3.select('#svgRootGroup')
      .attr('transform',
        'translate(' + d3.event.translate + ')' + 'scale(' + d3.event.scale + ')')
      .attr('style', 'stroke-width: ' + 1 / d3.event.scale);
    //To make scale-dependent features possible....
    if ($scope.zoomLevel !== d3.event.scale) {
      $scope.zoomLevel = d3.event.scale;
      $scope.$apply();
    }
  };

  const blockScroll = function () {
    d3.event.preventDefault();
  };
  d3.select('#graphSvg')
    .on('mousewheel', blockScroll)
    .on('DOMMouseScroll', blockScroll)
    .call(d3.behavior.zoom()
      .on('zoom', redraw));




  // ===== Menubar configuration =========
  $scope.topNavMenu = [];
  $scope.topNavMenu.push({
    key: 'new',
    label: i18n.translate('xpack.graph.topNavMenu.newWorkspaceLabel', {
      defaultMessage: 'New',
    }),
    description: i18n.translate('xpack.graph.topNavMenu.newWorkspaceAriaLabel', {
      defaultMessage: 'New Workspace',
    }),
    tooltip: i18n.translate('xpack.graph.topNavMenu.newWorkspaceTooltip', {
      defaultMessage: 'Create a new workspace',
    }),
    run: function () {
      canWipeWorkspace(function () {
        $scope.$evalAsync(() => {
          kbnUrl.change('/workspace/', {});
        });
      });  },
    testId: 'graphNewButton',
  });

  // if saving is disabled using uiCapabilities, we don't want to render the save
  // button so it's consistent with all of the other applications
  if (capabilities.get().graph.save) {
    // allSavingDisabled is based on the xpack.graph.savePolicy, we'll maintain this functionality

    $scope.topNavMenu.push({
      key: 'save',
      label: i18n.translate('xpack.graph.topNavMenu.saveWorkspace.enabledLabel', {
        defaultMessage: 'Save',
      }),
      description: i18n.translate('xpack.graph.topNavMenu.saveWorkspace.enabledAriaLabel', {
        defaultMessage: 'Save workspace',
      }),
      tooltip: () => {
        if (allSavingDisabled) {
          return i18n.translate('xpack.graph.topNavMenu.saveWorkspace.disabledTooltip', {
            defaultMessage: 'No changes to saved workspaces are permitted by the current save policy',
          });
        } else {
          return i18n.translate('xpack.graph.topNavMenu.saveWorkspace.enabledTooltip', {
            defaultMessage: 'Save this workspace',
          });
        }
      },
      disableButton: function () {
        return allSavingDisabled || selectedFieldsSelector(store.getState());
      },
      run: () => {
        store.dispatch({
          type: 'x-pack/graph/SAVE_WORKSPACE',
          payload: $route.current.locals.savedWorkspace,
        });
      },
      testId: 'graphSaveButton',
    });
  }
  $scope.topNavMenu.push({
    key: 'inspect',
    disableButton: function () { return $scope.workspace === null; },
    label: i18n.translate('xpack.graph.topNavMenu.inspectLabel', {
      defaultMessage: 'Inspect',
    }),
    description: i18n.translate('xpack.graph.topNavMenu.inspectAriaLabel', {
      defaultMessage: 'Inspect',
    }),
    run: () => {
      $scope.$evalAsync(() => {
        const curState = $scope.menus.showInspect;
        $scope.closeMenus();
        $scope.menus.showInspect = !curState;
      });
    },
  });

  let currentSettingsFlyout;
  $scope.topNavMenu.push({
    key: 'settings',
    disableButton: function () { return datasourceSelector(store.getState()).type === 'none'; },
    label: i18n.translate('xpack.graph.topNavMenu.settingsLabel', {
      defaultMessage: 'Settings',
    }),
    description: i18n.translate('xpack.graph.topNavMenu.settingsAriaLabel', {
      defaultMessage: 'Settings',
    }),
    run: () => {
      if (currentSettingsFlyout) {
        currentSettingsFlyout.close();
        return;
      }
      const settingsObservable = asAngularSyncedObservable(() => ({
        advancedSettings: { ...$scope.exploreControls },
        updateAdvancedSettings: (updatedSettings) => {
          $scope.exploreControls = updatedSettings;
          if ($scope.workspace) {
            $scope.workspace.options.exploreControls = updatedSettings;
          }
        },
        blacklistedNodes: $scope.workspace ? [...$scope.workspace.blacklistedNodes] : undefined,
        unblacklistNode: $scope.workspace ? $scope.workspace.unblacklist : undefined,
        urlTemplates: [...$scope.urlTemplates],
        removeUrlTemplate: $scope.removeUrlTemplate,
        saveUrlTemplate: $scope.saveUrlTemplate,
        allFields: [...$scope.allFields],
        canEditDrillDownUrls: chrome.getInjected('canEditDrillDownUrls')
      }), $scope.$digest.bind($scope));
      currentSettingsFlyout = npStart.core.overlays.openFlyout(<Settings observable={settingsObservable} />, {
        size: 'm',
        closeButtonAriaLabel: i18n.translate('xpack.graph.settings.closeLabel', { defaultMessage: 'Close' }),
        'data-test-subj': 'graphSettingsFlyout',
        ownFocus: true,
        className: 'gphSettingsFlyout',
        maxWidth: 520,
      });
      currentSettingsFlyout.onClose.then(() => { currentSettingsFlyout = null; });
    },
  });

  updateBreadcrumbs();

  $scope.menus = {
    showSettings: false,
  };

  $scope.closeMenus = () => {
    _.forOwn($scope.menus, function (_, key) {
      $scope.menus[key] = false;
    });
  };

  // Deal with situation of request to open saved workspace
  if ($route.current.locals.savedWorkspace.id) {
    store.dispatch({
      type: 'x-pack/graph/LOAD_WORKSPACE',
      payload: $route.current.locals.savedWorkspace,
    });
  } else {
    const managementUrl = npStart.core.chrome.navLinks.get('kibana:management').url;
    const url = `${managementUrl}/kibana/index_patterns`;

    if ($route.current.locals.indexPatterns.length === 0) {
      toastNotifications.addWarning({
        title: i18n.translate('xpack.graph.noDataSourceNotificationMessageTitle', {
          defaultMessage: 'No data source',
        }),
        text: (
          <p>
            <FormattedMessage
              id="xpack.graph.noDataSourceNotificationMessageText"
              defaultMessage="Go to {managementIndexPatternsLink} and create an index pattern"
              values={{
                managementIndexPatternsLink: (
                  <a href={url}>
                    <FormattedMessage
                      id="xpack.graph.noDataSourceNotificationMessageText.managementIndexPatternLinkText"
                      defaultMessage="Management &gt; Index Patterns"
                    />
                  </a>
                )
              }}
            />
          </p>
        ),
      });

      return;
    }
    openSourceModal(npStart.core, indexPattern => {
      store.dispatch(
        requestDatasource({
          type: 'indexpattern',
          id: indexPattern.id,
          title: indexPattern.attributes.title
        })
      );
    });
  }
});

