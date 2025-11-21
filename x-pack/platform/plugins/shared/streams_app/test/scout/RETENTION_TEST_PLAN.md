# Retention/Lifecycle Test Plan for Streams App

## Overview
This document outlines the comprehensive test plan for Streams app retention and lifecycle functionality, following patterns established in the AI suggestions/partitioning tests.

## Current State
- **Existing Test**: `data_retention/data_retention.spec.ts` (2 basic tests)
- **Production Code**: `stream_detail_lifecycle/` directory with modal, cards, and helpers
- **Key Components**:
  - General data retention card and modal
  - Failure store retention card and modal
  - ILM integration
  - DSL custom retention
  - Inheritance from parent/index template

## Test Files to Create/Expand

### 1. `retention_modal_interactions.spec.ts` (NEW)
**Reference**: `ai_suggestions_interactions.spec.ts`
**Purpose**: Test all modal interaction workflows

**Tests**:
- Open/close modal via edit button
- Close modal via cancel button and X button
- Close modal with Escape key
- Modal displays current retention settings
- Save button states (enabled/disabled)
- Form validation states in modal
- Modal preserves values on cancel
- Modal resets on successful save

**Key selectors**:
- `streamsAppRetentionMetadataEditDataRetentionButton`
- `editLifecycleModalTitle`
- `streamsAppModalFooterCancelButton`
- `streamsAppModalFooterButton`

### 2. `custom_retention_periods.spec.ts` (EXPAND)
**Reference**: `routing_condition_operators.spec.ts`
**Purpose**: Comprehensive testing of custom DSL retention periods

**Tests**:
- Set retention with different time units (days/hours/minutes/seconds)
- Set various retention values (1, 7, 30, 90, 365)
- Unit dropdown selection and display
- Unit conversion validation
- Negative value validation (should error)
- Decimal value validation (should error)
- Zero value validation (should error)
- Non-numeric input validation (should error)
- Empty field validation
- Very large values (e.g., 10000 days)
- Retention value persistence across page refresh

**Key selectors**:
- `customRetentionButton`
- `streamsAppDslModalDaysField`
- `streamsAppDslModalButton`
- `streamsAppDslModalUnitOption-d/h/m/s`
- `retention-metric`

### 3. `ilm_policy_retention.spec.ts` (NEW)
**Reference**: `ai_suggestions_generation.spec.ts`
**Purpose**: Test ILM policy integration

**Tests**:
- ILM button selection
- ILM policy dropdown population
- Select specific ILM policy
- ILM policy name display in retention card
- ILM link navigation to management
- Save button disabled until policy selected
- ILM policy validation
- Switch between ILM policies
- ILM policy display in streams table

**Key selectors**:
- `ilmRetentionButton`
- ILM dropdown (check modal code for exact selector)
- ILM link element

**Note**: Only available in non-serverless environments

### 4. `indefinite_retention.spec.ts` (NEW)
**Reference**: `ai_suggestions_accept.spec.ts`
**Purpose**: Test indefinite (unlimited) retention mode

**Tests**:
- Select indefinite retention button
- Infinity symbol (∞) displays in retention card
- Switch from custom to indefinite
- Switch from ILM to indefinite
- Indefinite retention persists after save
- Indefinite retention displays in streams table
- Modal shows indefinite state correctly

**Key selectors**:
- `indefiniteRetentionButton`
- `retention-metric` (verify ∞ text)

### 5. `retention_inheritance.spec.ts` (NEW)
**Reference**: `ai_suggestions_editing_validation.spec.ts`
**Purpose**: Test retention inheritance from parent/index template

**Tests**:
- **Wired Streams (child)**:
  - Inherit toggle visible
  - Toggle on: inherits parent retention
  - Toggle off: enables custom retention
  - Display "Inherit from parent" badge
  - Display "Override parent" badge when toggled off
- **Classic Streams (non-root)**:
  - Inherit toggle visible
  - Toggle on: inherits index template retention
  - Display "Inherit from index template" badge
  - Display "Override index template" badge
- **Root Streams**:
  - No inherit toggle visible
  - Only custom retention options available
- Switch inherit on → custom → inherit on (verify reset)
- Inherit state persists across modal open/close
- Save with inherit enabled
- Save with inherit disabled and custom value

**Key selectors**:
- `inheritDataRetentionSwitch`
- `inheritRetentionHeading`
- `customRetentionHeading`

**Setup**: Need streams with parent-child relationships

### 6. `retention_mode_switching.spec.ts` (NEW)
**Reference**: `routing_preview_cell_actions.spec.ts`
**Purpose**: Test switching between retention modes

**Tests**:
- Custom → ILM: switch and verify
- ILM → Custom: switch and verify
- Custom → Indefinite: switch and verify
- Indefinite → Custom: switch and verify
- ILM → Indefinite: switch and verify
- Indefinite → ILM: switch and verify
- Previous custom value preserved when switching back
- ILM selection preserved when switching back
- Modal state updates correctly on mode switch

**Key selectors**:
- `dataRetentionButtonGroup`
- All retention mode buttons

### 7. `failure_store_retention.spec.ts` (EXPAND/NEW)
**Reference**: `create_routing_rules.spec.ts`
**Purpose**: Test failure store specific retention (IMPORTANT - NOT EDGE CASE)

**Tests**:
- Navigate to failure store retention section
- Failure store retention card visible
- Edit failure store retention independently
- Set custom retention for failure store
- Set indefinite retention for failure store
- Set ILM policy for failure store (if supported)
- Inherit toggle for failure store
- Failure store retention doesn't affect main data retention
- Main data retention doesn't affect failure store retention
- Both retention values display correctly
- Update both retentions in sequence
- Verify independence of storage metrics

**Key selectors**:
- Failure store specific test IDs (check component code)
- Separate retention cards for main/failure store

**File**: `data_retention/failure_store.spec.ts` already exists - expand it

### 8. `retention_display_values.spec.ts` (NEW)
**Reference**: `routing_data_preview.spec.ts`
**Purpose**: Test how retention values are formatted and displayed

**Tests**:
- 7d displays as "7 days"
- 24h displays as "24 hours"
- 60m displays as "60 minutes"
- 3600s displays as "3600 seconds"
- 1d displays as "1 day" (singular)
- Indefinite displays as "∞"
- ILM policy name displays correctly
- "Inherit from parent" badge displays
- "Override parent" badge displays
- "Inherit from index template" badge displays
- "Override index template" badge displays
- "ILM policy" subtitle displays
- "Custom period" subtitle displays
- "Indefinite" subtitle displays
- Retention column in streams table shows correct values

**Key selectors**:
- `retention-metric`
- `retentionCard`
- `retentionColumn-{streamName}` in streams table

### 9. `retention_validation.spec.ts` (NEW)
**Reference**: `error_handling.spec.ts`
**Purpose**: Test validation and error handling

**Tests**:
- Empty retention value shows error
- Negative value shows error: "A positive integer is required"
- Decimal value shows error: "A positive integer is required"
- Non-numeric shows error: "A positive integer is required"
- Zero shows error: "A positive integer is required"
- Save button disabled when validation fails
- Save button enabled when validation passes
- API error handling with toast notification
- Network error handling
- Validation error clears when fixed
- Multiple validation errors
- Validation on inherit mode (should skip)

**Key selectors**:
- Error text elements in modal
- Toast notifications

### 10. `retention_privileges.spec.ts` (NEW)
**Purpose**: Test permission-based behavior

**Tests**:
- Edit button disabled without lifecycle privileges
- Edit button tooltip explains missing privilege
- Modal opens in read-only mode without privilege
- Inherit switch disabled without privilege
- Save button disabled without privilege
- View retention card without edit privilege
- Verify `definition.privileges.lifecycle` flag

**Setup**: Need user with/without lifecycle privileges

### 11. `retention_storage_metrics.spec.ts` (NEW)
**Purpose**: Test retention alongside other lifecycle metrics

**Tests**:
- Retention card displays with storage size card
- Retention card displays with rollover card
- Update retention without affecting storage display
- Storage metrics refresh after retention change
- All lifecycle cards visible in correct order
- Lifecycle tab shows complete data

**Key selectors**:
- Multiple lifecycle card test IDs
- Storage size, rollover, retention cards

## Test Helpers to Create

### File: `retention_helpers.ts`
**Reference**: `ai_suggestions_helpers.ts`

```typescript
// Test IDs constants
export const RETENTION_TEST_IDS = {
  editButton: 'streamsAppRetentionMetadataEditDataRetentionButton',
  modal: 'editLifecycleModalTitle',
  inheritSwitch: 'inheritDataRetentionSwitch',
  buttonGroup: 'dataRetentionButtonGroup',
  indefiniteButton: 'indefiniteRetentionButton',
  customButton: 'customRetentionButton',
  ilmButton: 'ilmRetentionButton',
  dslField: 'streamsAppDslModalDaysField',
  unitButton: 'streamsAppDslModalButton',
  cancelButton: 'streamsAppModalFooterCancelButton',
  saveButton: 'streamsAppModalFooterButton',
  retentionMetric: 'retention-metric',
  retentionCard: 'retentionCard',
};

// Mock retention values
export const MOCK_RETENTION_VALUES = {
  sevenDays: { value: '7', unit: 'd', display: '7 days' },
  twentyFourHours: { value: '24', unit: 'h', display: '24 hours' },
  sixtyMinutes: { value: '60', unit: 'm', display: '60 minutes' },
  ninetyDays: { value: '90', unit: 'd', display: '90 days' },
  oneYear: { value: '365', unit: 'd', display: '365 days' },
};

// Helper functions
export async function openRetentionModal(page: ScoutPage): Promise<Locator>;
export async function closeRetentionModal(page: ScoutPage, method: 'cancel' | 'escape' | 'x');
export async function setCustomRetention(page: ScoutPage, value: string, unit: 'd' | 'h' | 'm' | 's');
export async function setIndefiniteRetention(page: ScoutPage);
export async function selectIlmPolicy(page: ScoutPage, policyName: string);
export async function toggleInheritSwitch(page: ScoutPage, enabled: boolean);
export async function saveRetentionChanges(page: ScoutPage);
export async function verifyRetentionDisplay(page: ScoutPage, expectedValue: string);
export async function verifyRetentionBadge(page: ScoutPage, badgeText: string);
export async function selectRetentionMode(page: ScoutPage, mode: 'indefinite' | 'custom' | 'ilm');
export async function verifyModalState(page: ScoutPage, expectedState: object);
```

## Test Data Setup

### Required API Methods
- `apiServices.streams.enable()`
- `apiServices.streams.disable()`
- `apiServices.streams.forkStream(parent, child, condition)`
- `apiServices.streams.clearStreamChildren(streamName)`
- `apiServices.streams.updateStreamLifecycle(streamName, lifecycle)` (if exists)

### Test Streams
- `logs` - root stream
- `logs.nginx` - child stream for inheritance tests
- `logs.apache` - second child for multiple children tests
- `logs.app` - for failure store tests

### Time Ranges
Use existing `DATE_RANGE` from generators

## Implementation Order

### Phase 1: Core Functionality (Must Have)
1. ✅ `retention_helpers.ts` - Create helper utilities first
2. ✅ `custom_retention_periods.spec.ts` - Expand existing with comprehensive tests
3. ✅ `retention_modal_interactions.spec.ts` - Modal behavior
4. ✅ `retention_validation.spec.ts` - Validation and errors
5. ✅ `retention_display_values.spec.ts` - Display formatting

### Phase 2: Advanced Features (Should Have)
6. ✅ `retention_inheritance.spec.ts` - Inheritance logic
7. ✅ `retention_mode_switching.spec.ts` - Mode transitions
8. ✅ `indefinite_retention.spec.ts` - Indefinite mode
9. ✅ `ilm_policy_retention.spec.ts` - ILM integration

### Phase 3: Integration & Edge Cases (Nice to Have)
10. ✅ `failure_store_retention.spec.ts` - Failure store (IMPORTANT)
11. ✅ `retention_privileges.spec.ts` - Permissions
12. ✅ `retention_storage_metrics.spec.ts` - Integration with other metrics

## Key Patterns from AI Suggestions Tests

### Setup Pattern
```typescript
test.beforeAll(async ({ apiServices, logsSynthtraceEsClient }) => {
  await apiServices.streams.enable();
  await logsSynthtraceEsClient.clean();
  await generateLogsData(logsSynthtraceEsClient)({ index: 'logs' });
});

test.beforeEach(async ({ browserAuth, pageObjects }) => {
  await browserAuth.loginAsAdmin();
  await pageObjects.streams.gotoDataRetentionTab('logs.nginx');
  await pageObjects.datePicker.setAbsoluteRange(DATE_RANGE);
});

test.afterEach(async ({ apiServices }) => {
  await apiServices.streams.clearStreamChildren('logs');
});

test.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
  await logsSynthtraceEsClient.clean();
  await apiServices.streams.disable();
});
```

### Test Structure Pattern
- Use descriptive test names
- Test one thing per test
- Use data-test-subj attributes for selectors
- Include both positive and negative test cases
- Test tag with `@ess` and/or `@svlOblt`

### Assertion Pattern
```typescript
await expect(page.getByTestId('element')).toBeVisible();
await expect(page.getByTestId('element')).toHaveValue('expected');
await expect(page.getByTestId('element')).toContainText('text');
await expect(page.getByTestId('element')).toBeDisabled();
await expect(page.getByTestId('element')).not.toBeChecked();
```

## Success Criteria
- [ ] All 11 test files created/expanded
- [ ] retention_helpers.ts utility file created
- [ ] 150+ test cases implemented
- [ ] All tests passing on @ess
- [ ] All tests passing on @svlOblt (except ILM tests)
- [ ] Code coverage for all retention/lifecycle components
- [ ] Test patterns consistent with AI suggestions tests
- [ ] Documentation updated

## Estimated Lines of Code
- Helper utilities: ~300 lines
- Test files: ~2,500 lines
- **Total**: ~2,800 lines of test code
