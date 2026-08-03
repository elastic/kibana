/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

export class EisModelsPage {
  // Header
  readonly pageHeader: Locator;
  readonly documentationLink: Locator;

  // Search and Filters
  readonly searchBar: Locator;
  readonly modelFamilyFilter: Locator;

  // Model Cards
  readonly allModelCards: Locator;

  // Empty State
  readonly noModelsFound: Locator;

  // Model Detail Flyout
  readonly flyout: Locator;
  readonly flyoutTaskBadges: Locator;
  readonly flyoutModelDetails: Locator;
  readonly flyoutRegionBadges: Locator;
  readonly flyoutAddEndpointButton: Locator;
  readonly flyoutCloseButton: Locator;
  readonly allEndpointRows: Locator;

  // Add/View Endpoint Modal
  readonly addEndpointModal: Locator;
  readonly addEndpointSaveButton: Locator;
  readonly addEndpointCancelButton: Locator;
  readonly addEndpointCloseButton: Locator;
  readonly addEndpointIdField: Locator;

  // Manage Region Preferences Modal
  readonly manageRegionsButton: Locator;
  readonly manageRegionsModal: Locator;
  readonly manageRegionsCancelButton: Locator;
  readonly manageRegionsSaveButton: Locator;
  readonly manageRegionsCallout: Locator;
  readonly manageRegionsErrorCallout: Locator;
  readonly manageRegionsLoading: Locator;
  readonly manageRegionsNoGeos: Locator;
  readonly manageRegionsNoRegions: Locator;
  readonly manageRegionsGeoTab: Locator;
  readonly manageRegionsRegionsTab: Locator;
  readonly manageRegionsSelectAllButton: Locator;
  readonly manageRegionsExpandAllButton: Locator;
  // Confirm Region Change Modal
  readonly confirmRegionChangeModal: Locator;
  readonly confirmRegionChangeModalGeoList: Locator;
  readonly confirmRegionChangeModalRegionList: Locator;
  readonly confirmRegionChangeSaveButton: Locator;
  readonly confirmRegionChangeCancelButton: Locator;

  constructor(private readonly page: ScoutPage) {
    // Header
    this.pageHeader = this.page.testSubj.locator('eisModelsPageHeader');
    this.documentationLink = this.page.testSubj.locator('eis_documentation');

    // Search and Filters
    this.searchBar = this.page.testSubj.locator('eisModelsSearchBar');
    this.modelFamilyFilter = this.page.testSubj.locator('modelFamilyFilterMultiselect');

    // Model Cards
    this.allModelCards = this.page.testSubj
      .locator('eisModelCards')
      .locator('[data-test-subj^="eisModelCard-"]');

    // Empty State
    this.noModelsFound = this.page.testSubj.locator('eisNoModelsFound');

    // Model Detail Flyout
    this.flyout = this.page.testSubj.locator('modelDetailFlyout');
    this.flyoutTaskBadges = this.page.testSubj.locator('flyoutTaskBadges');
    this.flyoutModelDetails = this.page.testSubj.locator('flyoutModelDetails');
    this.flyoutRegionBadges = this.page.testSubj.locator('flyoutRegionBadges');
    this.flyoutAddEndpointButton = this.page.testSubj.locator('modelDetailFlyoutAddEndpointButton');
    this.flyoutCloseButton = this.page.testSubj.locator('modelDetailFlyoutCloseButton');
    this.allEndpointRows = this.page.testSubj
      .locator('modelDetailFlyout')
      .locator('[data-test-subj^="endpoint-row-"]');

    // Add/View Endpoint Modal
    this.addEndpointModal = this.page.testSubj.locator('addEndpointModal');
    this.addEndpointSaveButton = this.page.testSubj.locator('addEndpointModalSaveButton');
    this.addEndpointCancelButton = this.page.testSubj.locator('addEndpointModalCancelButton');
    this.addEndpointCloseButton = this.page.testSubj.locator('addEndpointModalCloseButton');
    this.addEndpointIdField = this.page.testSubj.locator('addEndpointIdField');

    // Manage Region Preferences Modal
    this.manageRegionsButton = this.page.testSubj.locator('eisManageRegionsButton');
    this.manageRegionsModal = this.page.testSubj.locator('manageRegionsModal');
    this.manageRegionsCancelButton = this.page.testSubj.locator('manageRegionsCancelButton');
    this.manageRegionsSaveButton = this.page.testSubj.locator('manageRegionsSaveButton');
    this.manageRegionsCallout = this.page.testSubj.locator('manageRegionsCallout');
    this.manageRegionsErrorCallout = this.page.testSubj.locator('manageRegionsErrorCallout');
    this.manageRegionsLoading = this.page.testSubj.locator('manageRegionsLoading');
    this.manageRegionsNoGeos = this.page.testSubj.locator('manageRegionsNoGeos');
    this.manageRegionsNoRegions = this.page.testSubj.locator('manageRegionsNoRegions');
    this.manageRegionsGeoTab = this.page.testSubj.locator('manageRegionsGeoTab');
    this.manageRegionsRegionsTab = this.page.testSubj.locator('manageRegionsRegionsTab');
    this.manageRegionsSelectAllButton = this.page.testSubj.locator('manageRegionsSelectAllButton');
    this.manageRegionsExpandAllButton = this.page.testSubj.locator('manageRegionsExpandAllButton');
    // Confirm Region Change Modal
    this.confirmRegionChangeModal = this.page.testSubj.locator('confirmRegionChangeModal');
    this.confirmRegionChangeModalGeoList = this.page.testSubj.locator('confirmModalGeoList');
    this.confirmRegionChangeModalRegionList = this.page.testSubj.locator('confirmModalRegionList');
    this.confirmRegionChangeSaveButton = this.page.testSubj.locator('confirmModalConfirmButton');
    this.confirmRegionChangeCancelButton = this.page.testSubj.locator('confirmModalCancelButton');
  }

  // --- Navigation ---

  public async goto() {
    await this.page.gotoApp('management/modelManagement/elastic_inference_service');
    await this.page.testSubj.waitForSelector('eisModelsPageHeader', { state: 'visible' });
  }

  // --- Parameterized Locators ---

  public modelCard(modelName: string): Locator {
    return this.page.testSubj.locator(`eisModelCard-${modelName}`);
  }

  public taskTypeFilter(category: string): Locator {
    return this.page.testSubj.locator(`eisTaskTypeFilter-${category}`);
  }

  public endpointRow(inferenceId: string): Locator {
    return this.page.testSubj.locator(`endpoint-row-${inferenceId}`);
  }

  public deleteEndpointButton(inferenceId: string): Locator {
    return this.page.testSubj.locator(`deleteEndpointButton-${inferenceId}`);
  }

  public geoZoneRow(geo: string): Locator {
    return this.page.testSubj.locator(`geoZoneRow-${geo}`);
  }

  public geoZoneCheckbox(geo: string): Locator {
    return this.page.testSubj.locator(`geoZoneCheckbox-${geo}`);
  }

  public regionZonePanel(geo: string): Locator {
    return this.page.testSubj.locator(`manageRegionsZone-${geo}`);
  }

  public regionZoneToggle(geo: string): Locator {
    return this.page.testSubj.locator(`manageRegionsZoneToggle-${geo}`);
  }

  public regionCheckbox(cspRegionKey: string): Locator {
    return this.page.testSubj.locator(`manageRegionsCheckbox-${cspRegionKey}`);
  }

  public flyoutRegionBadge(geo: string): Locator {
    return this.page.testSubj.locator(`flyoutRegionBadge-${geo}`);
  }

  public modelStatusBadge(id: string, kind: 'preview' | 'deprecated' | 'eol'): Locator {
    let prefix: string;
    switch (kind) {
      case 'preview':
        prefix = 'modelPreviewBadge';
        break;
      case 'deprecated':
        prefix = 'modelDeprecatedBadge';
        break;
      case 'eol':
        prefix = 'modelEolBadge';
        break;
    }
    return this.page.testSubj.locator(`${prefix}-${id}`);
  }
}
