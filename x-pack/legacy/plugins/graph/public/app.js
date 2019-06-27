/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import d3 from 'd3';
import { i18n } from '@kbn/i18n';
import 'ace';
import rison from 'rison-node';
import React from 'react';

// import the uiExports that we want to "use"
import 'uiExports/fieldFormats';
import 'uiExports/savedObjectTypes';

import 'ui/autoload/all';
// TODO: remove ui imports completely (move to plugins)
import 'ui/kbn_top_nav';
import 'ui/directives/saved_object_finder';
import 'ui/directives/input_focus';
import 'ui/saved_objects/ui/saved_object_save_as_checkbox';
import chrome from 'ui/chrome';
import { uiModules } from 'ui/modules';
import uiRoutes from 'ui/routes';
import { notify, addAppRedirectMessageToUrl, fatalError, toastNotifications } from 'ui/notify';
import { IndexPatternsProvider } from 'ui/index_patterns/index_patterns';
import { SavedObjectsClientProvider } from 'ui/saved_objects';
import { KibanaParsedUrl } from 'ui/url/kibana_parsed_url';
import { npStart } from 'ui/new_platform';

import { XPackInfoProvider } from 'plugins/xpack_main/services/xpack_info';

import appTemplate from './templates/index.html';
import { getHomeBreadcrumbs, getWorkspaceBreadcrumbs } from './breadcrumbs';
import { getReadonlyBadge } from './badge';
import { FormattedMessage } from '@kbn/i18n/react';

import './angular-venn-simple.js';
import gws from './graphClientWorkspace.js';
import utils from './utils.js';
import { SavedWorkspacesProvider } from './services/saved_workspaces';
import {
  iconChoices,
  colorChoices,
  iconChoicesByClass,
  drillDownIconChoices,
  drillDownIconChoicesByClass
} from './style_choices';
import {
  getOutlinkEncoders,
} from './services/outlink_encoders';
import { capabilities } from 'ui/capabilities';

import saveTemplate from './templates/save_workspace.html';
import loadTemplate from './templates/load_workspace.html';
import settingsTemplate from './templates/settings.html';

const app = uiModules.get('app/graph');

function checkLicense(Private, Promise, kbnBaseUrl) {
  const xpackInfo = Private(XPackInfoProvider);
  const licenseAllowsToShowThisPage = xpackInfo.get('features.graph.showAppLink') && xpackInfo.get('features.graph.enableAppLink');
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

if (uiRoutes.enable) {
  uiRoutes.enable();
}

uiRoutes
  .when('/home', {
    template: appTemplate,
    k7Breadcrumbs: getHomeBreadcrumbs,
    badge: getReadonlyBadge,
    resolve: {
      //Copied from example found in wizard.js ( Kibana TODO - can't
      // IndexPatternsProvider abstract these implementation details better?)
      indexPatterns: function (Private) {
        const savedObjectsClient = Private(SavedObjectsClientProvider);

        return savedObjectsClient.find({
          type: 'index-pattern',
          fields: ['title', 'type'],
          perPage: 10000
        }).then(response => response.savedObjects);
      },
      GetIndexPatternProvider: function (Private) {
        return Private(IndexPatternsProvider);
      },
      SavedWorkspacesProvider: function (Private) {
        return Private(SavedWorkspacesProvider);
      },
      CheckLicense: checkLicense
    }
  })
  .when('/workspace/:id', {
    template: appTemplate,
    k7Breadcrumbs: getWorkspaceBreadcrumbs,
    resolve: {
      savedWorkspace: function (savedGraphWorkspaces, courier, $route) {
        return savedGraphWorkspaces.get($route.current.params.id)
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
      // IndexPatternsProvider abstract these implementation details better?)
      indexPatterns: function (Private) {
        const savedObjectsClient = Private(SavedObjectsClientProvider);

        return savedObjectsClient.find({
          type: 'index-pattern',
          fields: ['title', 'type'],
          perPage: 10000
        }).then(response => response.savedObjects);
      },
      GetIndexPatternProvider: function (Private) {
        return Private(IndexPatternsProvider);
      },
      SavedWorkspacesProvider: function (Private) {
        return Private(SavedWorkspacesProvider);
      },
      CheckLicense: checkLicense
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
  Private,
  Promise,
  confirmModal,
  kbnBaseUrl,
  config
) {
  function handleSuccess(data) {
    return checkLicense(Private, Promise, kbnBaseUrl)
      .then(() => data);
  }

  function handleError(err) {
    return checkLicense(Private, Promise, kbnBaseUrl)
      .then(() => notify.error(err));
  }

  $scope.title = 'Graph';
  $scope.spymode = 'request';

  $scope.iconChoices = iconChoices;
  $scope.drillDownIconChoices = drillDownIconChoices;
  $scope.colors = colorChoices;
  $scope.iconChoicesByClass = iconChoicesByClass;

  $scope.outlinkEncoders = getOutlinkEncoders(i18n);

  $scope.fields = [];
  $scope.canEditDrillDownUrls = chrome.getInjected('canEditDrillDownUrls');

  $scope.graphSavePolicy = chrome.getInjected('graphSavePolicy');
  $scope.allSavingDisabled = $scope.graphSavePolicy === 'none';
  $scope.searchTerm = '';

  //So scope properties can be used consistently with ng-model
  $scope.grr = $scope;

  //Updates styling on all nodes in the UI that use this field
  $scope.applyColor = function (fieldDef, color) {
    fieldDef.color = color;
    if ($scope.workspace) {
      $scope.workspace.nodes.forEach(function (node) {
        if (node.data.field === fieldDef.name) {
          node.color = color;
        }
      });
    }
  };

  //Updates styling on all nodes in the UI that use this field
  $scope.applyIcon = function (fieldDef, icon) {
    fieldDef.icon = icon;
    if ($scope.workspace) {
      $scope.workspace.nodes.forEach(function (node) {
        if (node.data.field === fieldDef.name) {
          node.icon = icon;
        }
      });
    }
  };


  $scope.toggleDrillDownIcon = function (urlTemplate, icon) {
    urlTemplate.icon === icon ? urlTemplate.icon = null : urlTemplate.icon = icon;
  };

  $scope.openSavedWorkspace = function (savedWorkspace) {
    kbnUrl.change('/workspace/{{id}}', { id: savedWorkspace.id });
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


  //A live response field is one that is both selected and actively enabled for returning in responses
  // We call this function to refresh the array whenever there is a change in the conditions.
  $scope.updateLiveResponseFields = function () {
    $scope.liveResponseFields = $scope.selectedFields.filter(function (fieldDef) {
      return (fieldDef.hopSize > 0) && fieldDef.selected;
    });
  };

  $scope.selectedFieldConfigHopSizeChanged = function () {
    // Only vertex fields with hop size > 0 are deemed "live"
    // so when there is a change we re-evaluate the list of live fields
    $scope.updateLiveResponseFields();
  };

  $scope.hideAllConfigPanels = function () {
    $scope.selectedFieldConfig = null;
    $scope.kbnTopNav.close();
  };

  $scope.setAllFieldStatesToDefault = function () {
    $scope.selectedFields = [];
    $scope.basicModeSelectedSingleField = null;
    $scope.liveResponseFields = [];

    // Default field state is not selected
    $scope.allFields.forEach(function (fieldDef) {
      fieldDef.selected = false;
    });
  };

  $scope.addFieldToSelection =  function () {
    $scope.selectedField.selected = true;
    if ($scope.selectedFields.indexOf($scope.selectedField) < 0) {
      $scope.selectedFields.push($scope.selectedField);
    }
    $scope.updateLiveResponseFields();
    //Force load of the config panel for the field
    $scope.clickVertexFieldIcon($scope.selectedField);
  };

  $scope.clickVertexFieldIcon = function (field, $event) {
    // Shift click is a fast way to toggle if the field is active or not.
    if ($event && field) {
      if ($event.shiftKey) {
        if (field.hopSize === 0) {
          field.hopSize = field.lastValidHopSize ? field.lastValidHopSize : 5;
        }else {
          field.lastValidHopSize = field.hopSize;
          field.hopSize = 0;
        }
        $scope.updateLiveResponseFields();
        return;
      }
    }

    // Check if user is toggling off an already-open config panel for the current field
    if ($scope.kbnTopNav.currentKey === 'fieldConfig' && field === $scope.selectedFieldConfig) {
      $scope.hideAllConfigPanels();
      return;
    }
    $scope.hideAllConfigPanels();
    $scope.selectedFieldConfig = field;
    $scope.kbnTopNav.currentKey = 'fieldConfig';
  };

  function canWipeWorkspace(yesFn, noFn) {
    if ($scope.selectedFields.length === 0 && $scope.workspace === null) {
      yesFn();
      return;
    }
    const confirmModalOptions = {
      onConfirm: yesFn,
      onCancel: noFn,
      confirmButtonText: i18n.translate('xpack.graph.clearWorkspace.confirmButtonLabel', {
        defaultMessage: 'Clear workspace',
      })
    };
    confirmModal(i18n.translate('xpack.graph.clearWorkspace.confirmText', {
      defaultMessage: 'This will clear the workspace - are you sure?',
    }), confirmModalOptions);
  }

  $scope.uiSelectIndex = function () {
    canWipeWorkspace(function () {
      $scope.indexSelected($scope.proposedIndex);
    }, function () {
      $scope.proposedIndex = $scope.selectedIndex;
    });
  };

  $scope.indexSelected = function (selectedIndex, postInitHandler) {
    $scope.clearWorkspace();
    $scope.allFields = [];
    $scope.selectedFields = [];
    $scope.basicModeSelectedSingleField = null;
    $scope.selectedField = null;
    $scope.selectedFieldConfig = null;
    $scope.selectedIndex = selectedIndex;
    $scope.proposedIndex = selectedIndex;

    const promise = $route.current.locals.GetIndexPatternProvider.get(selectedIndex.id);
    promise
      .then(handleSuccess)
      .then(function (indexPattern) {
        const patternFields = indexPattern.getNonScriptedFields();
        const blockedFieldNames = ['_id', '_index', '_score', '_source', '_type'];
        patternFields.forEach(function (field, index) {
          if (blockedFieldNames.indexOf(field.name) >= 0) {
            return;
          }
          const graphFieldDef = {
            'name': field.name
          };
          $scope.allFields.push(graphFieldDef);
          graphFieldDef.hopSize = 5; //Default the number of results returned per hop
          graphFieldDef.lastValidHopSize = graphFieldDef.hopSize;
          graphFieldDef.icon = $scope.iconChoices[0];
          for (let i = 0; i < $scope.iconChoices.length; i++) {
            const icon = $scope.iconChoices[i];
            for (let p = 0; p < icon.patterns.length; p++) {
              const pattern = icon.patterns[p];
              if (pattern.test(graphFieldDef.name)) {
                graphFieldDef.icon = icon;
                break;
              }
            }
          }
          graphFieldDef.color = $scope.colors[index % $scope.colors.length];
        });
        $scope.setAllFieldStatesToDefault();

        $scope.allFields.sort(function (a, b) {
        // TODO - should we use "popularity" setting from index pattern definition?
        // What is its intended use? Couldn't see it on the patternField objects
          if (a.name < b.name) {
            return -1;
          } else if (a.name > b.name) {
            return 1;
          }
          return 0;
        });
        $scope.filteredFields = $scope.allFields;
        if ($scope.allFields.length > 0) {
          $scope.selectedField = $scope.allFields[0];
        }


        if (postInitHandler) {
          postInitHandler();
        }

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
      .catch(handleError);
  }


  //Helper function for the graphClientWorkspace to perform a query
  const callSearchNodeProxy = function (indexName, query, responseHandler) {
    const request = {
      index: indexName,
      body: query
    };
    $http.post('../api/graph/searchProxy', request)
      .then(function (resp) {
        responseHandler(resp.data.resp);
      })
      .catch(handleError);
  };

  $scope.submit = function () {
    $scope.hideAllConfigPanels();
    initWorkspaceIfRequired();
    const numHops = 2;
    if ($scope.searchTerm.startsWith('{')) {
      try {
        const query = JSON.parse($scope.searchTerm);
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
    $scope.workspace.simpleSearch($scope.searchTerm, $scope.liveResponseFields, numHops);
  };

  $scope.clearWorkspace = function () {
    $scope.workspace = null;
    $scope.detail = null;
    if ($scope.kbnTopNav) {
      $scope.kbnTopNav.close();
    }
  };

  $scope.toggleShowAdvancedFieldsConfig = function () {
    if ($scope.kbnTopNav.currentKey !== 'fields') {
      $scope.kbnTopNav.close();
      $scope.kbnTopNav.currentKey = 'fields';
      //Default the selected field
      $scope.selectedField = null;
      $scope.filteredFields = $scope.allFields.filter(function (fieldDef) {
        return !fieldDef.selected;
      });
      if ($scope.filteredFields.length > 0) {
        $scope.selectedField = $scope.filteredFields[0];
      }
    } else {
      $scope.hideAllConfigPanels();
    }
  };

  $scope.removeVertexFieldSelection = function () {
    $scope.selectedFieldConfig.selected = false;
    // Find and remove field from array (important not to just make a new filtered array because
    // this array instance is shared with $scope.workspace)
    const i = $scope.selectedFields.indexOf($scope.selectedFieldConfig);
    if (i !== -1) {
      $scope.selectedFields.splice(i, 1);
    }
    $scope.updateLiveResponseFields();
    $scope.hideAllConfigPanels();
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

  $scope.filterFieldsKeyDown = function () {
    const lcFilter = $scope.fieldNamesFilterString.toLowerCase();
    $scope.filteredFields = $scope.allFields.filter(function (fieldDef) {
      return !fieldDef.selected && (!lcFilter || lcFilter === ''
      || fieldDef.name.toLowerCase().indexOf(lcFilter) >= 0);
    });
  };

  //== Drill-down functionality ==
  const defaultKibanaQuery = ',query:(query_string:(analyze_wildcard:!t,query:\'*\'))';
  const drillDownRegex = /\{\{gquery\}\}/;

  $scope.checkForKibanaUrl = function () {
    $scope.suggestTemplateFix = $scope.newUrlTemplate.url === $scope.lastPastedURL  &&
                                $scope.newUrlTemplate.url.indexOf(defaultKibanaQuery) > 0;
  };

  $scope.replaceKibanaUrlParam = function () {
    $scope.newUrlTemplate.url = $scope.newUrlTemplate.url.replace(defaultKibanaQuery, ',query:{{gquery}}');
    $scope.lastPastedURL = null;
    $scope.checkForKibanaUrl();
  };

  $scope.rejectKibanaUrlSuggestion = function () {
    $scope.lastPastedURL = null;
    $scope.checkForKibanaUrl();
  };

  function detectKibanaUrlPaste(url) {
    $scope.lastPastedURL = url;
    $scope.checkForKibanaUrl();
  }

  $scope.handleUrlTemplatePaste = function ($event) {
    window.setTimeout(function () {
      detectKibanaUrlPaste(angular.element($event.currentTarget).val());
      $scope.$digest();
    }, 0);
  };


  $scope.resetNewUrlTemplate = function () {
    $scope.newUrlTemplate = {
      url: null,
      description: null,
      encoder: $scope.outlinkEncoders[0]
    };
  };

  $scope.editUrlTemplate = function (urlTemplate) {
    Object.assign($scope.newUrlTemplate, urlTemplate, { templateBeingEdited: urlTemplate });
  };

  $scope.saveUrlTemplate = function () {
    const found = $scope.newUrlTemplate.url.search(drillDownRegex) > -1;
    if (!found) {
      toastNotifications.addWarning({
        title: i18n.translate('xpack.graph.settings.drillDowns.invalidUrlWarningTitle', {
          defaultMessage: 'Invalid URL',
        }),
        text: i18n.translate('xpack.graph.settings.drillDowns.invalidUrlWarningText', {
          defaultMessage: 'The URL must contain a {placeholder} string',
          values: {
            placeholder: '{{gquery}}'
          }
        }),
      });
      return;
    }
    if ($scope.newUrlTemplate.templateBeingEdited) {

      if ($scope.urlTemplates.indexOf($scope.newUrlTemplate.templateBeingEdited) >= 0) {
        //patch any existing object
        Object.assign($scope.newUrlTemplate.templateBeingEdited, $scope.newUrlTemplate, { isDefault: false });
        return;
      }
    }
    $scope.urlTemplates.push($scope.newUrlTemplate);
    $scope.resetNewUrlTemplate();
  };

  $scope.removeUrlTemplate = function (urlTemplate) {
    const i = $scope.urlTemplates.indexOf(urlTemplate);
    if (i != -1) {
      confirmModal(
        i18n.translate('xpack.graph.settings.drillDowns.removeConfirmText', {
          defaultMessage: 'Remove "{urlTemplateDesciption}" drill-down?',
          values: { urlTemplateDesciption: urlTemplate.description },
        }),
        {
          onConfirm: () => $scope.urlTemplates.splice(i, 1),
          confirmButtonText: i18n.translate('xpack.graph.settings.drillDowns.removeConfirmButtonLabel', {
            defaultMessage: 'Remove drill-down',
          }),
        },
      );
    }
  };

  $scope.openUrlTemplate = function (template) {
    const url = template.url;
    const newUrl = url.replace(drillDownRegex, template.encoder.encode($scope.workspace));
    window.open(newUrl, '_blank');
  };


  //============================

  $scope.resetWorkspace = function () {
    $scope.clearWorkspace();
    $scope.userHasConfirmedSaveWorkspaceData = false;
    $scope.selectedIndex = null;
    $scope.proposedIndex = null;
    $scope.detail = null;
    $scope.selectedSelectedVertex = null;
    $scope.selectedField = null;
    $scope.description = null;
    $scope.allFields = [];
    $scope.urlTemplates = [];
    $scope.resetNewUrlTemplate();

    $scope.fieldNamesFilterString = null;
    $scope.filteredFields = [];

    $scope.selectedFields = [];
    $scope.configPanel = 'settings';
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
      indexName: $scope.selectedIndex.attributes.title,
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
        query: tag,
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

  $scope.indices = $route.current.locals.indexPatterns.filter(indexPattern => !indexPattern.get('type'));


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
    $scope.detail = {
      'mergeCandidates': utils.getMergeSuggestionObjects(termIntersects)
    };
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

  if ($scope.indices.length === 0) {
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
    run: function () {canWipeWorkspace(function () {kbnUrl.change('/home', {}); });  },
  });

  // if saving is disabled using uiCapabilities, we don't want to render the save
  // button so it's consistent with all of the other applications
  if (capabilities.get().graph.save) {
    // allSavingDisabled is based on the xpack.graph.savePolicy, we'll maintain this functionality
    if (!$scope.allSavingDisabled) {
      $scope.topNavMenu.push({
        key: 'save',
        label: i18n.translate('xpack.graph.topNavMenu.saveWorkspace.enabledLabel', {
          defaultMessage: 'Save',
        }),
        description: i18n.translate('xpack.graph.topNavMenu.saveWorkspace.enabledAriaLabel', {
          defaultMessage: 'Save Workspace',
        }),
        tooltip: i18n.translate('xpack.graph.topNavMenu.saveWorkspace.enabledTooltip', {
          defaultMessage: 'Save this workspace',
        }),
        disableButton: function () {return $scope.selectedFields.length === 0;},
        template: saveTemplate,
        testId: 'graphSaveButton',
      });
    } else {
      $scope.topNavMenu.push({
        key: 'save',
        label: i18n.translate('xpack.graph.topNavMenu.saveWorkspace.disabledLabel', {
          defaultMessage: 'Save',
        }),
        description: i18n.translate('xpack.graph.topNavMenu.saveWorkspace.disabledAriaLabel', {
          defaultMessage: 'Save Workspace',
        }),
        tooltip: i18n.translate('xpack.graph.topNavMenu.saveWorkspace.disabledTooltip', {
          defaultMessage: 'No changes to saved workspaces are permitted by the current save policy',
        }),
        disableButton: true,
        testId: 'graphSaveButton',
      });
    }
  }
  $scope.topNavMenu.push({
    key: 'open',
    label: i18n.translate('xpack.graph.topNavMenu.loadWorkspaceLabel', {
      defaultMessage: 'Open',
    }),
    description: i18n.translate('xpack.graph.topNavMenu.loadWorkspaceAriaLabel', {
      defaultMessage: 'Load Saved Workspace',
    }),
    tooltip: i18n.translate('xpack.graph.topNavMenu.loadWorkspaceTooltip', {
      defaultMessage: 'Load a saved workspace',
    }),
    template: loadTemplate,
    testId: 'graphOpenButton',
  });
  // if deleting is disabled using uiCapabilities, we don't want to render the delete
  // button so it's consistent with all of the other applications
  if (capabilities.get().graph.delete) {

    // allSavingDisabled is based on the xpack.graph.savePolicy, we'll maintain this functionality
    if (!$scope.allSavingDisabled) {
      $scope.topNavMenu.push({
        key: 'delete',
        disableButton: function () {
          return $route.current.locals === undefined || $route.current.locals.savedWorkspace === undefined;
        },
        label: i18n.translate('xpack.graph.topNavMenu.deleteWorkspace.enabledLabel', {
          defaultMessage: 'Delete',
        }),
        description: i18n.translate('xpack.graph.topNavMenu.deleteWorkspace.enabledAriaLabel', {
          defaultMessage: 'Delete Saved Workspace',
        }),
        tooltip: i18n.translate('xpack.graph.topNavMenu.deleteWorkspace.enabledAriaTooltip', {
          defaultMessage: 'Delete this workspace',
        }),
        testId: 'graphDeleteButton',
        run: function () {
          const title = $route.current.locals.savedWorkspace.title;
          function doDelete() {
            $route.current.locals.SavedWorkspacesProvider.delete($route.current.locals.savedWorkspace.id);
            kbnUrl.change('/home', {});

            toastNotifications.addSuccess(
              i18n.translate('xpack.graph.topNavMenu.deleteWorkspaceNotification', {
                defaultMessage: `Deleted '{workspaceTitle}'`,
                values: { workspaceTitle: title },
              })
            );
          }
          const confirmModalOptions = {
            onConfirm: doDelete,
            confirmButtonText: i18n.translate('xpack.graph.topNavMenu.deleteWorkspace.confirmButtonLabel', {
              defaultMessage: 'Delete workspace',
            }),
          };
          confirmModal(
            i18n.translate('xpack.graph.topNavMenu.deleteWorkspace.confirmText', {
              defaultMessage: 'Are you sure you want to delete the workspace {title} ?',
              values: { title },
            }),
            confirmModalOptions
          );
        }
      });
    }else {
      $scope.topNavMenu.push({
        key: 'delete',
        disableButton: true,
        label: i18n.translate('xpack.graph.topNavMenu.deleteWorkspace.disabledLabel', {
          defaultMessage: 'Delete',
        }),
        description: i18n.translate('xpack.graph.topNavMenu.deleteWorkspace.disabledAriaLabel', {
          defaultMessage: 'Delete Saved Workspace',
        }),
        tooltip: i18n.translate('xpack.graph.topNavMenu.deleteWorkspace.disabledTooltip', {
          defaultMessage: 'No changes to saved workspaces are permitted by the current save policy',
        }),
        testId: 'graphDeleteButton',
      });
    }
  }
  $scope.topNavMenu.push({
    key: 'settings',
    disableButton: function () { return $scope.selectedIndex === null; },
    label: i18n.translate('xpack.graph.topNavMenu.settingsLabel', {
      defaultMessage: 'Settings',
    }),
    description: i18n.translate('xpack.graph.topNavMenu.settingsAriaLabel', {
      defaultMessage: 'Settings',
    }),
    template: settingsTemplate
  });


  // Deal with situation of request to open saved workspace
  if ($route.current.locals.savedWorkspace) {

    const wsObj = JSON.parse($route.current.locals.savedWorkspace.wsState);
    $scope.savedWorkspace = $route.current.locals.savedWorkspace;
    $scope.description = $route.current.locals.savedWorkspace.description;

    // Load any saved drill-down templates
    wsObj.urlTemplates.forEach(urlTemplate => {
      const encoder = $scope.outlinkEncoders.find(outlinkEncoder => outlinkEncoder.id === urlTemplate.encoderID);
      if (encoder) {
        const template = {
          url: urlTemplate.url,
          description: urlTemplate.description,
          encoder: encoder,
        };
        if (urlTemplate.iconClass) {
          template.icon = drillDownIconChoicesByClass[urlTemplate.iconClass];
        }
        $scope.urlTemplates.push(template);
      }
    });

    //Lookup the saved index pattern title
    let savedObjectIndexPattern = null;
    $scope.indices.forEach(function (savedObject) {
      // wsObj.indexPattern is the title string of an indexPattern which
      // we attempt here to look up in the list of currently saved objects
      // that contain index pattern definitions
      if(savedObject.attributes.title === wsObj.indexPattern) {
        savedObjectIndexPattern = savedObject;
      }
    });
    if(!savedObjectIndexPattern) {
      toastNotifications.addDanger(
        i18n.translate('xpack.graph.loadWorkspace.missingIndexPatternErrorMessage', {
          defaultMessage: 'Missing index pattern {indexPattern}',
          values: { indexPattern: wsObj.indexPattern },
        })
      );
      return;
    }

    $scope.indexSelected(savedObjectIndexPattern, function () {
      Object.assign($scope.exploreControls, wsObj.exploreControls);

      if ($scope.exploreControls.sampleDiversityField) {
        $scope.exploreControls.sampleDiversityField =  $scope.allFields.find(field =>
          $scope.exploreControls.sampleDiversityField.name === field.name);
      }

      for (const i in wsObj.selectedFields) {
        const savedField = wsObj.selectedFields[i];
        for (const f in $scope.allFields) {
          const field = $scope.allFields[f];
          if (savedField.name === field.name) {
            field.hopSize = savedField.hopSize;
            field.lastValidHopSize = savedField.lastValidHopSize;
            field.color = savedField.color;
            field.icon = $scope.iconChoicesByClass[savedField.iconClass];
            field.selected = true;
            $scope.selectedFields.push(field);
            break;
          }
        }
        //TODO what if field name no longer exists as part of the index-pattern definition?
      }

      $scope.updateLiveResponseFields();
      initWorkspaceIfRequired();
      const graph = {
        nodes: [],
        edges: []
      };
      for (const i in wsObj.vertices) {
        var vertex = wsObj.vertices[i]; // eslint-disable-line no-var
        const node = {
          field: vertex.field,
          term: vertex.term,
          label: vertex.label,
          color: vertex.color,
          icon: $scope.allFields.filter(function (fieldDef) {
            return vertex.field === fieldDef.name;
          })[0].icon,
          data: {}
        };
        graph.nodes.push(node);
      }
      for (const i in wsObj.blacklist) {
        var vertex = wsObj.vertices[i]; // eslint-disable-line no-var
        const fieldDef = $scope.allFields.filter(function (fieldDef) {
          return vertex.field === fieldDef.name;
        })[0];
        if (fieldDef) {
          const node = {
            field: vertex.field,
            term: vertex.term,
            label: vertex.label,
            color: vertex.color,
            icon: fieldDef.icon,
            data: {
              field: vertex.field,
              term: vertex.term
            }
          };
          $scope.workspace.blacklistedNodes.push(node);
        }
      }
      for (const i in wsObj.links) {
        const link = wsObj.links[i];
        graph.edges.push({
          source: link.source,
          target: link.target,
          inferred: link.inferred,
          label: link.label,
          term: vertex.term,
          width: link.width,
          weight: link.weight
        });
      }

      $scope.workspace.mergeGraph(graph);

      // Wire up parents and children
      for (const i in wsObj.vertices) {
        const vertex = wsObj.vertices[i];
        const vId = $scope.workspace.makeNodeId(vertex.field, vertex.term);
        const visNode = $scope.workspace.nodesMap[vId];
        // Default the positions.
        visNode.x = vertex.x;
        visNode.y = vertex.y;
        if (vertex.parent !== null) {
          const parentSavedObj = graph.nodes[vertex.parent];
          const parentId = $scope.workspace.makeNodeId(parentSavedObj.field, parentSavedObj.term);
          visNode.parent = $scope.workspace.nodesMap[parentId];
        }
      }
      $scope.workspace.runLayout();

      // Allow URLs to include a user-defined text query
      if ($route.current.params.query) {
        $scope.searchTerm = $route.current.params.query;
        $scope.submit();
      }

    });
  }else {
    $route.current.locals.SavedWorkspacesProvider.get().then(function (newWorkspace) {
      $scope.savedWorkspace = newWorkspace;
    });
  }

  $scope.saveWorkspace = function () {
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
      ($scope.graphSavePolicy === 'configAndDataWithConsent' && $scope.userHasConfirmedSaveWorkspaceData);


    let blacklist = [];
    let vertices = [];
    let links = [];
    if (canSaveData) {
      blacklist = $scope.workspace.blacklistedNodes.map(function (node) {
        return {
          x: node.x,
          y: node.y,
          field: node.data.field,
          term: node.data.term,
          label: node.label,
          color: node.color,
          parent: null,
          weight: node.weight,
          size: node.scaledSize,
        };
      });
      vertices = $scope.workspace.nodes.map(function (node) {
        return {
          x: node.x,
          y: node.y,
          field: node.data.field,
          term: node.data.term,
          label: node.label,
          color: node.color,
          parent: node.parent ? $scope.workspace.nodes.indexOf(node.parent) : null,
          weight: node.weight,
          size: node.scaledSize,
        };
      });
      links = $scope.workspace.edges.map(function (edge) {
        return {
          'weight': edge.weight,
          'width': edge.width,
          'inferred': edge.inferred,
          'label': edge.label,
          'source': $scope.workspace.nodes.indexOf(edge.source),
          'target': $scope.workspace.nodes.indexOf(edge.target)
        };
      });
    }

    const urlTemplates = $scope.urlTemplates.map(function (template) {
      const result = {
        'url': template.url,
        'description': template.description,
        'encoderID': template.encoder.id
      };
      if (template.icon) {
        result.iconClass = template.icon.class;
      }
      return result;
    });

    $scope.savedWorkspace.wsState = JSON.stringify({
      'indexPattern': $scope.selectedIndex.attributes.title,
      'selectedFields': $scope.selectedFields.map(function (field) {
        return {
          'name': field.name,
          'lastValidHopSize': field.lastValidHopSize,
          'color': field.color,
          'iconClass': field.icon.class,
          'hopSize': field.hopSize
        };
      }),
      blacklist,
      vertices,
      links,
      urlTemplates,
      exploreControls: $scope.exploreControls
    });
    $scope.savedWorkspace.numVertices = vertices.length;
    $scope.savedWorkspace.numLinks = links.length;
    $scope.savedWorkspace.description = $scope.description;


    $scope.savedWorkspace.save().then(function (id) {
      $scope.kbnTopNav.close('save');
      $scope.userHasConfirmedSaveWorkspaceData = false; //reset flag
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
        if ($scope.savedWorkspace.id === $route.current.params.id) return;
        $scope.openSavedWorkspace($scope.savedWorkspace);
      }
    }, fatalError);

  };



});
//End controller
