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
  readonly flyoutRegionUnavailableCallout: Locator;
  readonly allEndpointRows: Locator;

  // Add/View Endpoint Modal
  readonly addEndpointModal: Locator;
  readonly addEndpointSaveButton: Locator;
  readonly addEndpointCancelButton: Locator;
  readonly addEndpointCloseButton: Locator;
  readonly addEndpointIdField: Locator;
  readonly addEndpointReasoningToggle: Locator;

  // Manage Region Preferences Modal
  readonly manageRegionsButton: Locator;
  readonly manageRegionsModal: Locator;
  readonly manageRegionsCancelButton: Locator;
  readonly manageRegionsSaveButton: Locator;
  readonly manageRegionsCallout: Locator;
  readonly manageRegionsCalloutDismiss: Locator;
  readonly manageRegionsErrorCallout: Locator;
  readonly manageRegionsLoading: Locator;
  readonly manageRegionsNoGeos: Locator;
  readonly manageRegionsNoRegions: Locator;
  readonly manageRegionsLocationTypeGeo: Locator;
  readonly manageRegionsLocationTypeRegions: Locator;
  readonly manageRegionsSelectAllButton: Locator;
  readonly manageRegionsCustomPolicyToggle: Locator;
  // Confirm Region Change Modal
  readonly confirmRegionChangeModal: Locator;
  readonly confirmRegionChangeModalGeoList: Locator;
  readonly confirmRegionChangeModalRegionList: Locator;
  readonly confirmRegionChangeSaveButton: Locator;
  readonly confirmRegionChangeCancelButton: Locator;
  readonly confirmRegionSelectionModal: Locator;
  readonly confirmRegionSelectionGeoList: Locator;
  readonly confirmRegionSelectionCallout: Locator;
  readonly confirmRegionSelectionIgnoreCheckbox: Locator;
  readonly confirmRegionSelectionSaveButton: Locator;
  // Confirm Delete Region Policy Modal
  readonly confirmDeleteRegionPolicyModal: Locator;
  readonly confirmDeleteRegionPolicySaveButton: Locator;
  readonly confirmDeleteRegionPolicyCancelButton: Locator;
  readonly confirmDeleteRegionPolicyAcknowledge: Locator;

  constructor(private readonly page: ScoutPage) {
    // Header
    this.pageHeader = this.page.testSubj.locator('appHeaderTitle');

    // Search and Filters
    // The search box belongs to the Content List toolbar, which derives its
    // subjects from the toolbar root.
    this.searchBar = this.page.testSubj.locator('contentListToolbar-searchBox');
    // Resolves to the popover's filter button, so it is clicked directly.
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
    this.flyoutRegionUnavailableCallout = this.page.testSubj.locator(
      'modelDetailFlyoutRegionUnavailableCallout'
    );
    this.allEndpointRows = this.page.testSubj
      .locator('modelDetailFlyout')
      .locator('[data-test-subj^="endpoint-row-"]');

    // Add/View Endpoint Modal
    this.addEndpointModal = this.page.testSubj.locator('addEndpointModal');
    this.addEndpointSaveButton = this.page.testSubj.locator('addEndpointModalSaveButton');
    this.addEndpointCancelButton = this.page.testSubj.locator('addEndpointModalCancelButton');
    this.addEndpointCloseButton = this.page.testSubj.locator('addEndpointModalCloseButton');
    this.addEndpointIdField = this.page.testSubj.locator('addEndpointIdField');
    this.addEndpointReasoningToggle = this.page.testSubj.locator('addEndpointReasoningToggle');

    // Manage Region Preferences Modal
    this.manageRegionsButton = this.page.testSubj.locator('eisManageRegionsButton');
    this.manageRegionsModal = this.page.testSubj.locator('manageRegionsModal');
    this.manageRegionsCancelButton = this.page.testSubj.locator('manageRegionsCancelButton');
    this.manageRegionsSaveButton = this.page.testSubj.locator('manageRegionsSaveButton');
    this.manageRegionsCallout = this.page.testSubj.locator('manageRegionsCallout');
    this.manageRegionsCalloutDismiss = this.page.testSubj.locator('manageRegionsCalloutDismiss');
    this.manageRegionsErrorCallout = this.page.testSubj.locator('manageRegionsErrorCallout');
    this.manageRegionsLoading = this.page.testSubj.locator('manageRegionsLoading');
    this.manageRegionsNoGeos = this.page.testSubj.locator('manageRegionsNoGeos');
    this.manageRegionsNoRegions = this.page.testSubj.locator('manageRegionsNoRegions');
    this.manageRegionsLocationTypeGeo = this.page.testSubj.locator('manageRegionsLocationTypeGeo');
    this.manageRegionsLocationTypeRegions = this.page.testSubj.locator(
      'manageRegionsLocationTypeRegions'
    );
    this.manageRegionsSelectAllButton = this.page.testSubj.locator('manageRegionsSelectAllButton');
    this.manageRegionsCustomPolicyToggle = this.page.testSubj.locator(
      'manageRegionsCustomPolicyToggle'
    );
    // Confirm Region Change Modal
    this.confirmRegionChangeModal = this.page.testSubj.locator('confirmRegionChangeModal');
    this.confirmRegionChangeModalGeoList = this.page.testSubj.locator('confirmModalGeoList');
    this.confirmRegionChangeModalRegionList = this.page.testSubj.locator('confirmModalRegionList');
    this.confirmRegionChangeSaveButton = this.confirmRegionChangeModal.locator(
      '[data-test-subj="confirmModalConfirmButton"]'
    );
    this.confirmRegionChangeCancelButton = this.confirmRegionChangeModal.locator(
      '[data-test-subj="confirmModalCancelButton"]'
    );
    this.confirmRegionSelectionModal = this.page.testSubj.locator('confirmRegionSelectionModal');
    this.confirmRegionSelectionGeoList = this.page.testSubj.locator(
      'confirmRegionSelectionGeoList'
    );
    this.confirmRegionSelectionCallout = this.page.testSubj.locator(
      'confirmRegionSelectionCallout'
    );
    this.confirmRegionSelectionIgnoreCheckbox = this.page.testSubj.locator(
      'confirmRegionSelectionIgnoreCheckbox'
    );
    this.confirmRegionSelectionSaveButton = this.page.testSubj.locator(
      'confirmRegionSelectionSaveButton'
    );
    // Confirm Delete Region Policy Modal
    this.confirmDeleteRegionPolicyModal = this.page.testSubj.locator(
      'confirmDeleteRegionPolicyModal'
    );
    this.confirmDeleteRegionPolicyAcknowledge = this.page.testSubj.locator(
      'confirmDeleteRegionPolicyAcknowledge'
    );
    this.confirmDeleteRegionPolicySaveButton = this.confirmDeleteRegionPolicyModal.locator(
      '[data-test-subj="confirmModalConfirmButton"]'
    );
    this.confirmDeleteRegionPolicyCancelButton = this.confirmDeleteRegionPolicyModal.locator(
      '[data-test-subj="confirmModalCancelButton"]'
    );
  }

  // --- Navigation ---

  public async goto() {
    await this.page.gotoApp('management/modelManagement/elastic_inference_service');
    await this.page.testSubj.waitForSelector('appHeaderTitle', { state: 'visible' });
  }

  // --- Actions ---

  /**
   * `EuiSearchBar` commits its value on keyup, the native `search` event, or a
   * native `change` event — never on a bare `input`, which is all
   * `Locator.fill` dispatches. Pressing Enter fires the `search` event.
   */
  public async search(term: string) {
    await this.searchBar.fill(term);
    await this.searchBar.press('Enter');
  }

  public async clearSearch() {
    await this.search('');
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

  public geoZoneCheckbox(geo: string): Locator {
    return this.page.testSubj.locator(`geoZoneCheckbox-${geo}`);
  }

  public confirmRegionSelectionIssue(index: number): Locator {
    return this.page.testSubj.locator(`confirmRegionSelectionIssue-${index}`);
  }

  public async startGeoPolicySave(geo: string) {
    await this.manageRegionsButton.click();
    await this.manageRegionsLoading.waitFor({ state: 'hidden' });
    await this.manageRegionsCustomPolicyToggle.click();
    await this.geoZoneCheckbox(geo).click();
    await this.manageRegionsSaveButton.click();
  }

  public regionZonePanel(geo: string): Locator {
    return this.page.testSubj.locator(`manageRegionsZone-${geo}`);
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
