/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import 'ace';
import React from 'react';
import { Provider } from 'react-redux';
import { isColorDark, hexToRgb } from '@elastic/eui';

// import the uiExports that we want to "use"
import 'uiExports/fieldFormats';
import 'uiExports/savedObjectTypes';

import 'ui/autoload/all';
import 'ui/angular-bootstrap';
import 'ui/kbn_top_nav';
import 'ui/directives/saved_object_finder';
import 'ui/directives/input_focus';
import 'ui/saved_objects/ui/saved_object_save_as_checkbox';
import 'uiExports/autocompleteProviders';
import chrome from 'ui/chrome';
import { uiModules } from 'ui/modules';
import uiRoutes from 'ui/routes';
import { addAppRedirectMessageToUrl, toastNotifications } from 'ui/notify';
import { formatAngularHttpError } from 'ui/notify/lib';
import { start as data } from '../../../../../src/legacy/core_plugins/data/public/legacy';
import { SavedObjectsClientProvider } from 'ui/saved_objects';
import { npStart } from 'ui/new_platform';
import { SavedObjectRegistryProvider } from 'ui/saved_objects/saved_object_registry';
import { capabilities } from 'ui/capabilities';
import { showSaveModal } from 'ui/saved_objects/show_saved_object_save_modal';
import { Storage } from 'ui/storage';

import { xpackInfo } from 'plugins/xpack_main/services/xpack_info';

import appTemplate from './angular/templates/index.html';
import listingTemplate from './angular/templates/listing_ng_wrapper.html';
import { getReadonlyBadge } from './badge';

import { GraphApp } from './components/app';
import { VennDiagram } from './components/venn_diagram';
import { Listing } from './components/listing';
import { Settings } from './components/settings';
import { GraphVisualization } from './components/graph_visualization';

import gws from './angular/graph_client_workspace.js';
import { SavedWorkspacesProvider } from './angular/services/saved_workspaces';
import { getEditUrl, getNewPath, getEditPath, setBreadcrumbs } from './services/url';
import { createCachedIndexPatternProvider } from './services/index_pattern_cache';
import { urlTemplateRegex } from './helpers/url_template';
import { asAngularSyncedObservable } from './helpers/as_observable';
import { colorChoices } from './helpers/style_choices';
import { createGraphStore, datasourceSelector, hasFieldsSelector } from './state_management';

import './angular/directives/graph_inspect';

const app = uiModules.get('app/graph');

function checkLicense(kbnBaseUrl) {
  const licenseAllowsToShowThisPage =
    xpackInfo.get('features.graph.showAppLink') && xpackInfo.get('features.graph.enableAppLink');
  if (!licenseAllowsToShowThisPage) {
    const message = xpackInfo.get('features.graph.message');
    const newUrl = addAppRedirectMessageToUrl(chrome.addBasePath(kbnBaseUrl), message);
    window.location.href = newUrl;
    throw new Error('Graph license error');
  }
}

app.directive('vennDiagram', function(reactDirective) {
  return reactDirective(VennDiagram);
});

app.directive('graphListing', function(reactDirective) {
  return reactDirective(Listing, [
    ['coreStart', { watchDepth: 'reference' }],
    ['createItem', { watchDepth: 'reference' }],
    ['findItems', { watchDepth: 'reference' }],
    ['deleteItems', { watchDepth: 'reference' }],
    ['editItem', { watchDepth: 'reference' }],
    ['getViewUrl', { watchDepth: 'reference' }],
    ['listingLimit', { watchDepth: 'reference' }],
    ['hideWriteControls', { watchDepth: 'reference' }],
    ['capabilities', { watchDepth: 'reference' }],
    ['initialFilter', { watchDepth: 'reference' }],
  ]);
});

app.directive('graphApp', function(reactDirective) {
  return reactDirective(
    GraphApp,
    [
      ['store', { watchDepth: 'reference' }],
      ['isInitialized', { watchDepth: 'reference' }],
      ['currentIndexPattern', { watchDepth: 'reference' }],
      ['indexPatternProvider', { watchDepth: 'reference' }],
      ['isLoading', { watchDepth: 'reference' }],
      ['onQuerySubmit', { watchDepth: 'reference' }],
      ['initialQuery', { watchDepth: 'reference' }],
      ['confirmWipeWorkspace', { watchDepth: 'reference' }],
      ['coreStart', { watchDepth: 'reference' }],
      ['noIndexPatterns', { watchDepth: 'reference' }],
      ['reduxStore', { watchDepth: 'reference' }],
      ['pluginDataStart', { watchDepth: 'reference' }],
    ],
    { restrict: 'A' }
  );
});

app.directive('graphVisualization', function(reactDirective) {
  return reactDirective(GraphVisualization, undefined, { restrict: 'A' });
});

if (uiRoutes.enable) {
  uiRoutes.enable();
}

uiRoutes
  .when('/home', {
    template: listingTemplate,
    badge: getReadonlyBadge,
    controller($injector, $location, $scope, Private, config, kbnBaseUrl) {
      checkLicense(kbnBaseUrl);
      const services = Private(SavedObjectRegistryProvider).byLoaderPropertiesName;
      const graphService = services['Graph workspace'];
      const kbnUrl = $injector.get('kbnUrl');

      $scope.listingLimit = config.get('savedObjects:listingLimit');
      $scope.create = () => {
        kbnUrl.redirect(getNewPath());
      };
      $scope.find = search => {
        return graphService.find(search, $scope.listingLimit);
      };
      $scope.editItem = workspace => {
        kbnUrl.redirect(getEditPath(workspace));
      };
      $scope.getViewUrl = workspace => getEditUrl(chrome, workspace);
      $scope.delete = workspaces => {
        return graphService.delete(workspaces.map(({ id }) => id));
      };
      $scope.capabilities = capabilities.get().graph;
      $scope.initialFilter = $location.search().filter || '';
      $scope.coreStart = npStart.core;
      setBreadcrumbs({ chrome });
    },
  })
  .when('/workspace/:id?', {
    template: appTemplate,
    badge: getReadonlyBadge,
    resolve: {
      savedWorkspace: function(savedGraphWorkspaces, $route) {
        return $route.current.params.id
          ? savedGraphWorkspaces.get($route.current.params.id).catch(function() {
              toastNotifications.addDanger(
                i18n.translate('xpack.graph.missingWorkspaceErrorMessage', {
                  defaultMessage: 'Missing workspace',
                })
              );
            })
          : savedGraphWorkspaces.get();
      },
      indexPatterns: function(Private) {
        const savedObjectsClient = Private(SavedObjectsClientProvider);

        return savedObjectsClient
          .find({
            type: 'index-pattern',
            fields: ['title', 'type'],
            perPage: 10000,
          })
          .then(response => response.savedObjects);
      },
      GetIndexPatternProvider: function(Private) {
        return data.indexPatterns.indexPatterns;
      },
      SavedWorkspacesProvider: function(Private) {
        return Private(SavedWorkspacesProvider);
      },
    },
  })
  .otherwise({
    redirectTo: '/home',
  });

//========  Controller for basic UI ==================
app.controller('graphuiPlugin', function($scope, $route, $http, kbnUrl, confirmModal, kbnBaseUrl) {
  checkLicense(kbnBaseUrl);

  function handleError(err) {
    checkLicense(kbnBaseUrl);
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
  }

  async function handleHttpError(error) {
    checkLicense(kbnBaseUrl);
    toastNotifications.addDanger(formatAngularHttpError(error));
  }

  // Replacement function for graphClientWorkspace's comms so
  // that it works with Kibana.
  function callNodeProxy(indexName, query, responseHandler) {
    const request = {
      index: indexName,
      query: query,
    };
    $scope.loading = true;
    return $http
      .post('../api/graph/graphExplore', request)
      .then(function(resp) {
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
  const callSearchNodeProxy = function(indexName, query, responseHandler) {
    const request = {
      index: indexName,
      body: query,
    };
    $scope.loading = true;
    $http
      .post('../api/graph/searchProxy', request)
      .then(function(resp) {
        responseHandler(resp.data.resp);
      })
      .catch(handleHttpError)
      .finally(() => {
        $scope.loading = false;
      });
  };

  $scope.indexPatternProvider = createCachedIndexPatternProvider(
    $route.current.locals.GetIndexPatternProvider.get
  );

  const store = createGraphStore({
    basePath: chrome.getBasePath(),
    indexPatternProvider: $scope.indexPatternProvider,
    indexPatterns: $route.current.locals.indexPatterns,
    createWorkspace: (indexPattern, exploreControls) => {
      const options = {
        indexName: indexPattern,
        vertex_fields: [],
        // Here we have the opportunity to look up labels for nodes...
        nodeLabeller: function() {
          //   console.log(newNodes);
        },
        changeHandler: function() {
          //Allows DOM to update with graph layout changes.
          $scope.$apply();
        },
        graphExploreProxy: callNodeProxy,
        searchProxy: callSearchNodeProxy,
        exploreControls,
      };
      $scope.workspace = gws.createWorkspace(options);
    },
    setLiveResponseFields: fields => {
      $scope.liveResponseFields = fields;
    },
    setUrlTemplates: urlTemplates => {
      $scope.urlTemplates = urlTemplates;
    },
    getWorkspace: () => {
      return $scope.workspace;
    },
    getSavedWorkspace: () => {
      return $route.current.locals.savedWorkspace;
    },
    notifications: npStart.core.notifications,
    http: npStart.core.http,
    showSaveModal,
    setWorkspaceInitialized: () => {
      $scope.workspaceInitialized = true;
    },
    savePolicy: chrome.getInjected('graphSavePolicy'),
    changeUrl: newUrl => {
      $scope.$evalAsync(() => {
        kbnUrl.change(newUrl, {});
      });
    },
    notifyAngular: () => {
      $scope.$digest();
    },
    chrome,
  });

  // register things on scope passed down to react components
  $scope.pluginDataStart = npStart.plugins.data;
  $scope.store = new Storage(window.localStorage);
  $scope.coreStart = npStart.core;
  $scope.loading = false;
  $scope.reduxStore = store;
  $scope.savedWorkspace = $route.current.locals.savedWorkspace;

  // register things for legacy angular UI
  const allSavingDisabled = chrome.getInjected('graphSavePolicy') === 'none';
  $scope.spymode = 'request';
  $scope.colors = colorChoices;
  $scope.isColorDark = color => isColorDark(...hexToRgb(color));
  $scope.nodeClick = function(n, $event) {
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

  function canWipeWorkspace(callback, text, options) {
    if (!hasFieldsSelector(store.getState())) {
      callback();
      return;
    }
    const confirmModalOptions = {
      onConfirm: callback,
      onCancel: () => {},
      confirmButtonText: i18n.translate('xpack.graph.leaveWorkspace.confirmButtonLabel', {
        defaultMessage: 'Leave anyway',
      }),
      title: i18n.translate('xpack.graph.leaveWorkspace.modalTitle', {
        defaultMessage: 'Unsaved changes',
      }),
      ...options,
    };
    confirmModal(
      text ||
        i18n.translate('xpack.graph.leaveWorkspace.confirmText', {
          defaultMessage: 'If you leave now, you will lose unsaved changes.',
        }),
      confirmModalOptions
    );
  }
  $scope.confirmWipeWorkspace = canWipeWorkspace;

  $scope.clickEdge = function(edge) {
    if (edge.inferred) {
      $scope.setDetail({ inferredEdge: edge });
    } else {
      $scope.workspace.getAllIntersections($scope.handleMergeCandidatesCallback, [
        edge.topSrc,
        edge.topTarget,
      ]);
    }
  };

  $scope.submit = function(searchTerm) {
    $scope.workspaceInitialized = true;
    const numHops = 2;
    if (searchTerm.startsWith('{')) {
      try {
        const query = JSON.parse(searchTerm);
        if (query.vertices) {
          // Is a graph explore request
          $scope.workspace.callElasticsearch(query);
        } else {
          // Is a regular query DSL query
          $scope.workspace.search(query, $scope.liveResponseFields, numHops);
        }
      } catch (err) {
        handleError(err);
      }
      return;
    }
    $scope.workspace.simpleSearch(searchTerm, $scope.liveResponseFields, numHops);
  };

  $scope.selectSelected = function(node) {
    $scope.detail = {
      latestNodeSelection: node,
    };
    return ($scope.selectedSelectedVertex = node);
  };

  $scope.isSelectedSelected = function(node) {
    return $scope.selectedSelectedVertex === node;
  };

  $scope.openUrlTemplate = function(template) {
    const url = template.url;
    const newUrl = url.replace(urlTemplateRegex, template.encoder.encode($scope.workspace));
    window.open(newUrl, '_blank');
  };

  $scope.aceLoaded = editor => {
    editor.$blockScrolling = Infinity;
  };

  $scope.setDetail = function(data) {
    $scope.detail = data;
  };

  $scope.performMerge = function(parentId, childId) {
    let found = true;
    while (found) {
      found = false;
      for (const i in $scope.detail.mergeCandidates) {
        const mc = $scope.detail.mergeCandidates[i];
        if (mc.id1 === childId || mc.id2 === childId) {
          $scope.detail.mergeCandidates.splice(i, 1);
          found = true;
          break;
        }
      }
    }
    $scope.workspace.mergeIds(parentId, childId);
    $scope.detail = null;
  };

  $scope.handleMergeCandidatesCallback = function(termIntersects) {
    const mergeCandidates = [];
    for (const i in termIntersects) {
      const ti = termIntersects[i];
      mergeCandidates.push({
        id1: ti.id1,
        id2: ti.id2,
        term1: ti.term1,
        term2: ti.term2,
        v1: ti.v1,
        v2: ti.v2,
        overlap: ti.overlap,
      });
    }
    $scope.detail = { mergeCandidates };
  };

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
    run: function() {
      canWipeWorkspace(function() {
        kbnUrl.change('/workspace/', {});
      });
    },
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
            defaultMessage:
              'No changes to saved workspaces are permitted by the current save policy',
          });
        } else {
          return i18n.translate('xpack.graph.topNavMenu.saveWorkspace.enabledTooltip', {
            defaultMessage: 'Save this workspace',
          });
        }
      },
      disableButton: function() {
        return allSavingDisabled || !hasFieldsSelector(store.getState());
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
    disableButton: function() {
      return $scope.workspace === null;
    },
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

  $scope.topNavMenu.push({
    key: 'settings',
    disableButton: function() {
      return datasourceSelector(store.getState()).type === 'none';
    },
    label: i18n.translate('xpack.graph.topNavMenu.settingsLabel', {
      defaultMessage: 'Settings',
    }),
    description: i18n.translate('xpack.graph.topNavMenu.settingsAriaLabel', {
      defaultMessage: 'Settings',
    }),
    run: () => {
      const settingsObservable = asAngularSyncedObservable(
        () => ({
          blacklistedNodes: $scope.workspace ? [...$scope.workspace.blacklistedNodes] : undefined,
          unblacklistNode: $scope.workspace ? $scope.workspace.unblacklist : undefined,
          canEditDrillDownUrls: chrome.getInjected('canEditDrillDownUrls'),
        }),
        $scope.$digest.bind($scope)
      );
      npStart.core.overlays.openFlyout(
        <Provider store={store}>
          <Settings observable={settingsObservable} />
        </Provider>,
        {
          size: 'm',
          closeButtonAriaLabel: i18n.translate('xpack.graph.settings.closeLabel', {
            defaultMessage: 'Close',
          }),
          'data-test-subj': 'graphSettingsFlyout',
          ownFocus: true,
          className: 'gphSettingsFlyout',
          maxWidth: 520,
        }
      );
    },
  });

  $scope.menus = {
    showSettings: false,
  };

  $scope.closeMenus = () => {
    _.forOwn($scope.menus, function(_, key) {
      $scope.menus[key] = false;
    });
  };

  // Deal with situation of request to open saved workspace
  if ($route.current.locals.savedWorkspace.id) {
    store.dispatch({
      type: 'x-pack/graph/LOAD_WORKSPACE',
      payload: $route.current.locals.savedWorkspace,
    });
    // Allow URLs to include a user-defined text query
    if ($route.current.params.query) {
      $scope.initialQuery = $route.current.params.query;
      const unbind = $scope.$watch('workspace', () => {
        if (!$scope.workspace) {
          return;
        }
        unbind();
        $scope.submit($route.current.params.query);
      });
    }
  } else {
    $scope.noIndexPatterns = $route.current.locals.indexPatterns.length === 0;
  }
});
