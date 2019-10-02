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
import 'ui/kbn_top_nav';
import 'ui/directives/saved_object_finder';
import 'ui/directives/input_focus';
import 'ui/saved_objects/ui/saved_object_save_as_checkbox';
import 'uiExports/autocompleteProviders';
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
import { Storage } from 'ui/storage';

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
import {
  iconChoices,
  colorChoices,
  iconChoicesByClass,
  urlTemplateIconChoices,
} from './helpers/style_choices';
import {
  outlinkEncoders,
} from './helpers/outlink_encoders';
import { getEditUrl, getNewPath, getEditPath, setBreadcrumbs, getHomePath } from './services/url';
import { openSourceModal } from './services/source_modal';
import { openSaveModal } from  './services/save_modal';
import { appStateToSavedWorkspace, savedWorkspaceToAppState, lookupIndexPattern, mapFields } from './services/persistence';
import { urlTemplateRegex } from  './helpers/url_template';
import {
  asAngularSyncedObservable,
} from './helpers/as_observable';
import {
  createGraphStore,
  loadFields,
  fieldsSelector,
  selectedFieldsSelector,
  liveResponseFieldsSelector
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
    ['state', { watchDepth: 'reference' }],
    ['dispatch', { watchDepth: 'reference' }],
    ['currentIndexPattern', { watchDepth: 'reference' }],
    ['isLoading', { watchDepth: 'reference' }],
    ['onIndexPatternSelected', { watchDepth: 'reference' }],
    ['onQuerySubmit', { watchDepth: 'reference' }],
    ['initialQuery', { watchDepth: 'reference' }],
    ['autocompleteStart', { watchDepth: 'reference' }],
    ['coreStart', { watchDepth: 'reference' }],
    ['store', { watchDepth: 'reference' }]
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
      savedWorkspace: function (savedGraphWorkspaces, courier, $route) {
        return $route.current.params.id && savedGraphWorkspaces.get($route.current.params.id)
          .catch(
            function () {
              toastNotifications.addDanger(
                i18n.translate('xpack.graph.missingWorkspaceErrorMessage', {
                  defaultMessage: 'Missing workspace',
                })
              );
            }
          );

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

  const store = createGraphStore();

  $scope.title = 'Graph';
  $scope.spymode = 'request';

  $scope.iconChoices = iconChoices;
  $scope.drillDownIconChoices = urlTemplateIconChoices;
  $scope.colors = colorChoices;
  $scope.iconChoicesByClass = iconChoicesByClass;

  $scope.outlinkEncoders = outlinkEncoders;

  $scope.fields = [];
  $scope.canEditDrillDownUrls = chrome.getInjected('canEditDrillDownUrls');

  $scope.graphSavePolicy = chrome.getInjected('graphSavePolicy');
  $scope.allSavingDisabled = $scope.graphSavePolicy === 'none';
  $scope.searchTerm = '';

  $scope.reduxDispatch = (action) => {
    store.dispatch(action);

    // patch updated icons and fields on the nodes in the workspace state
    // this workaround is necessary because the nodes are still managed by
    // angular - once they are moved over to redux, this can be handled in
    // the reducer
    if (action.type === 'x-pack/graph/fields/UPDATE_FIELD_PROPERTIES' &&
        action.payload.fieldProperties.color && $scope.workspace) {
      $scope.workspace.nodes.forEach(function (node) {
        if (node.data.field === action.payload.fieldName) {
          node.color = action.payload.fieldProperties.color;
        }
      });
    }

    if (action.type === 'x-pack/graph/fields/UPDATE_FIELD_PROPERTIES' &&
        action.payload.fieldProperties.icon && $scope.workspace) {
      $scope.workspace.nodes.forEach(function (node) {
        if (node.data.field === action.payload.fieldName) {
          node.icon = action.payload.fieldProperties.icon;
        }
      });
    }
  };


  $scope.store = new Storage(window.localStorage);
  $scope.coreStart = npStart.core;
  $scope.autocompleteStart = npStart.plugins.data.autocomplete;
  $scope.loading = false;

  const updateScope = () => {
    const newState = store.getState();
    $scope.reduxState = newState;
    $scope.allFields = fieldsSelector(newState);
    $scope.selectedFields = selectedFieldsSelector(newState);
    $scope.liveResponseFields = liveResponseFieldsSelector(newState);
    if ($scope.workspace) {
      $scope.workspace.options.vertex_fields = $scope.selectedFields;
    }
  };
  store.subscribe(updateScope);
  updateScope();

  //So scope properties can be used consistently with ng-model
  $scope.grr = $scope;

  $scope.toggleDrillDownIcon = function (urlTemplate, icon) {
    urlTemplate.icon === icon ? urlTemplate.icon = null : urlTemplate.icon = icon;
  };

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
    if ($scope.selectedFields.length === 0 && $scope.workspace === null) {
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

  $scope.indexSelected = function (selectedIndex) {
    $scope.clearWorkspace();
    $scope.allFields = [];
    $scope.selectedFields = [];
    $scope.basicModeSelectedSingleField = null;
    $scope.selectedField = null;
    $scope.selectedFieldConfig = null;

    return $route.current.locals.GetIndexPatternProvider.get(selectedIndex.id)
      .then(handleSuccess)
      .then(function (indexPattern) {
        $scope.selectedIndex = indexPattern;
        store.dispatch(loadFields(mapFields(indexPattern)));
        $scope.$digest();
      }, handleError);
  };


  $scope.clickEdge = function (edge) {
    if (edge.inferred) {
      $scope.setDetail ({ 'inferredEdge': edge });
    }else {
      $scope.workspace.getAllIntersections($scope.handleMergeCandidatesCallback, [edge.topSrc, edge.topTarget]);
    }
  };

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

  $scope.submit = function (searchTerm) {
    initWorkspaceIfRequired();
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

  $scope.saveUrlTemplate = function (index, urlTemplate) {
    const newTemplatesList = [...$scope.urlTemplates];
    if (index !== -1) {
      newTemplatesList[index] = urlTemplate;
    } else {
      newTemplatesList.push(urlTemplate);
    }

    $scope.urlTemplates = newTemplatesList;
  };

  $scope.removeUrlTemplate = function (urlTemplate) {
    const newTemplatesList = [...$scope.urlTemplates];
    const i = newTemplatesList.indexOf(urlTemplate);
    newTemplatesList.splice(i, 1);
    $scope.urlTemplates = newTemplatesList;
  };

  $scope.openUrlTemplate = function (template) {
    const url = template.url;
    const newUrl = url.replace(urlTemplateRegex, template.encoder.encode($scope.workspace));
    window.open(newUrl, '_blank');
  };


  //============================

  $scope.resetWorkspace = function () {
    $scope.clearWorkspace();
    $scope.selectedIndex = null;
    $scope.proposedIndex = null;
    $scope.detail = null;
    $scope.selectedSelectedVertex = null;
    $scope.selectedField = null;
    $scope.description = null;
    $scope.allFields = [];
    $scope.urlTemplates = [];

    $scope.fieldNamesFilterString = null;
    $scope.filteredFields = [];

    $scope.selectedFields = [];
    $scope.liveResponseFields = [];

    $scope.exploreControls = {
      useSignificance: true,
      sampleSize: 2000,
      timeoutMillis: 5000,
      sampleDiversityField: null,
      maxValuesPerDoc: 1,
      minDocCount: 3
    };
  };


  function initWorkspaceIfRequired() {
    if ($scope.workspace) {
      return;
    }
    const options = {
      indexName: $scope.selectedIndex.title,
      vertex_fields: $scope.selectedFields,
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
      exploreControls: $scope.exploreControls
    };
    $scope.workspace = gws.createWorkspace(options);
    $scope.detail = null;

    // filter out default url templates because they will get re-added
    $scope.urlTemplates = $scope.urlTemplates.filter(template => !template.isDefault);

    if ($scope.urlTemplates.length === 0) {
      // url templates specified by users can include the `{{gquery}}` tag and
      // will have the elasticsearch query for the graph nodes injected there
      const tag = '{{gquery}}';

      const kUrl = new KibanaParsedUrl({
        appId: 'kibana',
        basePath: chrome.getBasePath(),
        appPath: '/discover'
      });

      kUrl.addQueryParameter('_a', rison.encode({
        columns: ['_source'],
        index: $scope.selectedIndex.id,
        interval: 'auto',
        query: { language: 'kuery', query: tag },
        sort: ['_score', 'desc']
      }));

      const discoverUrl = kUrl.getRootRelativePath()
        // replace the URI encoded version of the tag with the unescaped version
        // so it can be found with String.replace, regexp, etc.
        .replace(encodeURIComponent(tag), tag);

      $scope.urlTemplates.push({
        url: discoverUrl,
        description: i18n.translate('xpack.graph.settings.drillDowns.defaultUrlTemplateTitle', {
          defaultMessage: 'Raw documents',
        }),
        encoder: $scope.outlinkEncoders[0],
        isDefault: true
      });
    }
  }

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

  //initialize all the state
  $scope.resetWorkspace();


  const blockScroll = function () {
    d3.event.preventDefault();
  };
  d3.select('#graphSvg')
    .on('mousewheel', blockScroll)
    .on('DOMMouseScroll', blockScroll)
    .call(d3.behavior.zoom()
      .on('zoom', redraw));


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
  }


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
        if ($scope.allSavingDisabled) {
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
        return $scope.allSavingDisabled || $scope.selectedFields.length === 0;
      },
      run: () => {
        openSaveModal({
          savePolicy: $scope.graphSavePolicy,
          hasData: $scope.workspace && ($scope.workspace.nodes.length > 0 || $scope.workspace.blacklistedNodes.length > 0),
          workspace: $scope.savedWorkspace,
          saveWorkspace: $scope.saveWorkspace,
          showSaveModal
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
    disableButton: function () { return $scope.selectedIndex === null; },
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
        canEditDrillDownUrls: $scope.canEditDrillDownUrls
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
  if ($route.current.locals.savedWorkspace) {
    $scope.savedWorkspace = $route.current.locals.savedWorkspace;
    const selectedIndex = lookupIndexPattern($scope.savedWorkspace, $route.current.locals.indexPatterns);
    if(!selectedIndex) {
      toastNotifications.addDanger(
        i18n.translate('xpack.graph.loadWorkspace.missingIndexPatternErrorMessage', {
          defaultMessage: 'Index pattern not found',
        })
      );
      return;
    }
    $route.current.locals.GetIndexPatternProvider.get(selectedIndex.id).then(indexPattern => {
      $scope.selectedIndex = indexPattern;
      initWorkspaceIfRequired();
      const {
        urlTemplates,
        advancedSettings,
        allFields,
      } = savedWorkspaceToAppState($scope.savedWorkspace, indexPattern, $scope.workspace);

      // wire up stuff to angular
      store.dispatch(loadFields(allFields));
      $scope.exploreControls = advancedSettings;
      $scope.workspace.options.exploreControls = advancedSettings;
      $scope.urlTemplates = urlTemplates;
      $scope.workspace.runLayout();
      // Allow URLs to include a user-defined text query
      if ($route.current.params.query) {
        $scope.initialQuery = $route.current.params.query;
        $scope.submit($route.current.params.query);
      }

      $scope.$digest();
    });
  } else {
    $route.current.locals.SavedWorkspacesProvider.get().then(function (newWorkspace) {
      $scope.savedWorkspace = newWorkspace;
      openSourceModal(npStart.core, indexPattern => {
        $scope.indexSelected(indexPattern);
      });
    });
  }

  $scope.saveWorkspace = function (saveOptions, userHasConfirmedSaveWorkspaceData) {
    if ($scope.allSavingDisabled) {
      // It should not be possible to navigate to this function if allSavingDisabled is set
      // but adding check here as a safeguard.
      toastNotifications.addWarning(
        i18n.translate('xpack.graph.saveWorkspace.disabledWarning', { defaultMessage: 'Saving is disabled' })
      );
      return;
    }
    initWorkspaceIfRequired();
    const canSaveData = $scope.graphSavePolicy === 'configAndData' ||
      ($scope.graphSavePolicy === 'configAndDataWithConsent' && userHasConfirmedSaveWorkspaceData);

    appStateToSavedWorkspace(
      $scope.savedWorkspace,
      {
        workspace: $scope.workspace,
        urlTemplates: $scope.urlTemplates,
        advancedSettings: $scope.exploreControls,
        selectedIndex: $scope.selectedIndex,
        selectedFields: $scope.selectedFields
      },
      canSaveData
    );

    return $scope.savedWorkspace.save(saveOptions).then(function (id) {
      if (id) {
        const title = i18n.translate('xpack.graph.saveWorkspace.successNotificationTitle', {
          defaultMessage: 'Saved "{workspaceTitle}"',
          values: { workspaceTitle: $scope.savedWorkspace.title },
        });
        let text;
        if (!canSaveData && $scope.workspace.nodes.length > 0) {
          text = i18n.translate('xpack.graph.saveWorkspace.successNotification.noDataSavedText', {
            defaultMessage: 'The configuration was saved, but the data was not saved',
          });
        }

        toastNotifications.addSuccess({
          title,
          text,
          'data-test-subj': 'saveGraphSuccess',
        });
        if ($scope.savedWorkspace.id !== $route.current.params.id) {
          kbnUrl.change(getEditPath($scope.savedWorkspace));
        }
      }
      return { id };
    }, fatalError);

  };



});
//End controller
