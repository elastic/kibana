# Kibana Alerts and Actions UI

The Kibana alerts and actions UI plugin provides a user interface for managing alerts and actions.
As a developer you can reuse and extend built-in alerts and actions UI functionality:

- Create and register a new Alert Type.
- Create and register a new Action Type.
- Embed the Create Alert flyout within any Kibana plugin.

---

Table of Contents

- [Kibana Alerts and Actions UI](#kibana-alerts-and-actions-ui)
  - [Built-in Alert Types](#built-in-alert-types)
    - [Index Threshold Alert](#index-threshold-alert)
  - [Alert type model definition](#alert-type-model-definition)
  - [Register alert type model](#register-alert-type-model)
  - [Create and register new alert type UI example](#create-and-register-new-alert-type-ui-example)
  - [Common expression components](#common-expression-components)
    - [WHEN expression component](#when-expression-component)
    - [OF expression component](#of-expression-component)
    - [GROUPED BY expression component](#grouped-by-expression-component)
    - [FOR THE LAST expression component](#for-the-last-expression-component)
    - [THRESHOLD expression component](#threshold-expression-component)
  - [Alert Conditions Components](#alert-conditions-components)
    - [The AlertConditions component](#the-alertconditions-component)
    - [The AlertConditionsGroup component](#the-alertconditionsgroup-component)
  - [Embed the Create Alert flyout within any Kibana plugin](#embed-the-create-alert-flyout-within-any-kibana-plugin)
  - [Build and register Action Types](#build-and-register-action-types)
    - [Server log](#server-log)
    - [Email](#email)
    - [Slack](#slack)
    - [Index](#index)
    - [Webhook](#webhook)
    - [PagerDuty](#pagerduty)
  - [Action type model definition](#action-type-model-definition)
    - [CustomConnectorSelectionItem Properties](#customconnectorselectionitem-properties)
  - [Register action type model](#register-action-type-model)
  - [Create and register new action type UI](#create-and-register-new-action-type-ui)
  - [Embed the Alert Actions form within any Kibana plugin](#embed-the-alert-actions-form-within-any-kibana-plugin)
  - [Embed the Create Connector flyout within any Kibana plugin](#embed-the-create-connector-flyout-within-any-kibana-plugin)
  - [Embed the Edit Connector flyout within any Kibana plugin](#embed-the-edit-connector-flyout-within-any-kibana-plugin)

## Built-in Alert Types

Kibana ships with several built-in alert types:

| Type                                      | Id          | Description           |
| ----------------------------------------- | ----------- | --------------------- |
| [Index Threshold](#index-threshold-alert) | `threshold` | Index Threshold Alert |

Every alert type must be registered server side, and can optionally be registered client side.
Only alert types registered on both client and server will be displayed in the Create Alert flyout, as a part of the UI.
Built-in alert types UI are located under the folder `x-pack/platform/plugins/shared/triggers_actions_ui/public/application/components/builtin_alert_types`
and this is a file `x-pack/platform/plugins/shared/triggers_actions_ui/public/application/components/builtin_alert_types/index.ts` for client side registration.

### Index Threshold Alert

ID: `threshold`

In the Kibana UI, this alert type is available as a select card on the Create Alert flyout:
![Index Threshold select card](https://i.imgur.com/a0bqLwC.png)

RuleTypeModel:

```
export function getAlertType(): RuleTypeModel {
  return {
    id: '.index-threshold',
    name: 'Index threshold',
    iconClass: 'alert',
    ruleParamsExpression: lazy(() => import('./index_threshold_expression')),
    validate: validateAlertType,
    requiresAppContext: false,
  };
}
```

ruleParamsExpression should be a lazy loaded React component extending an expression using `EuiExpression` components:
![Index Threshold Alert expression form](https://i.imgur.com/Ysk1ljY.png)

```
interface IndexThresholdProps {
  ruleParams: IndexThresholdRuleParams;
  setRuleParams: (property: string, value: any) => void;
  setRuleProperty: (key: string, value: any) => void;
  errors: { [key: string]: string[] };
}
```

| Property        | Description                                                                                                                      |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| ruleParams      | Set of Alert params relevant for the index threshold alert type.                                                                 |
| setRuleParams   | Alert reducer method, which is used to create a new copy of alert object with the changed params property any subproperty value. |
| setRuleProperty | Alert reducer method, which is used to create a new copy of alert object with the changed any direct alert property value.       |
| errors          | Alert level errors tracking object.                                                                                              |

Alert reducer is defined on the AlertAdd functional component level and passed down to the subcomponents to provide a new state of Alert object:

```
const [{ alert }, dispatch] = useReducer(alertReducer, { alert: initialAlert });

...

const setRuleProperty = (key: string, value: any) => {
    dispatch({ command: { type: 'setProperty' }, payload: { key, value } });
  };

  const setRuleParams = (key: string, value: any) => {
    dispatch({ command: { type: 'setRuleParams' }, payload: { key, value } });
  };

  const setScheduleProperty = (key: string, value: any) => {
    dispatch({ command: { type: 'setScheduleProperty' }, payload: { key, value } });
  };

  const setActionParamsProperty = (key: string, value: any, index: number) => {
    dispatch({ command: { type: 'setAlertActionParams' }, payload: { key, value, index } });
  };

  const setActionProperty = (key: string, value: any, index: number) => {
    dispatch({ command: { type: 'setAlertActionProperty' }, payload: { key, value, index } });
  };

```

'x-pack/platform/plugins/shared/triggers_actions_ui/public/application/sections/alert_add/alert_reducer.ts' define the methods for changing different type of alert properties:

```
export const alertReducer = (state: any, action: AlertReducerAction) => {
  const { command, payload } = action;
  const { alert } = state;

  switch (command.type) {
    // create a new alert state with a new alert value
    case 'setAlert': {
    ....
    //  create a new alert state with set new value to one alert property by key
    case 'setProperty': {
    ....
    // create a new alert state with set new value to any subproperty for a 'schedule' alert property
    case 'setScheduleProperty': {
    ....
    // create a new alert state with set new value to action subproperty by index from the array of alert actions
    case 'setAlertActionParams': {   //
    ....
    // create a new alert state with set new value to any subproperty for a 'params' alert property
    case 'setRuleParams': {
      const { key, value } = payload;
      if (isEqual(alert.params[key], value)) {
        return state;
      } else {
        return {
          ...state,
          alert: {
            ...alert,
            params: {
              ...alert.params,
              [key]: value,
            },
          },
        };
      }
    }
    // create a new alert state with add or remove action from alert actions array
    case 'setAlertActionProperty': {
    ....
    }
  }

```

The Expression component should be lazy loaded which means it'll have to be the default export in `index_threshold_expression.ts`:

```
export const IndexThresholdRuleTypeExpression: React.FunctionComponent<IndexThresholdProps> = ({
  ruleParams,
  setRuleParams,
  setRuleProperty,
  errors,
}) => {

  ....

  // expression validation
  const hasExpressionErrors = !!Object.keys(errors).find(
    errorKey =>
      expressionFieldsWithValidation.includes(errorKey) &&
      errors[errorKey].length >= 1 &&
      (ruleParams as { [key: string]: any })[errorKey] !== undefined
  );

  ....

  // loading indeces and set default expression values
  useEffect(() => {
    getIndexPatterns();
  }, []);

  useEffect(() => {
    setDefaultExpressionValues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  ....

  return (
    <>
      {hasExpressionErrors ? (
        <>
          <EuiSpacer />
          <EuiCallOut color="danger" size="s" title={expressionErrorMessage} />
          <EuiSpacer />
        </>
      ) : null}
      <EuiSpacer size="l" />
      <EuiFormLabel>
        <FormattedMessage
          defaultMessage="Select Index to query:"
          id="xpack.stackAlerts.threshold.ui.selectIndex"
        />
  ....
      </>
  );
};

// Export as default in order to support lazy loading
export {IndexThresholdRuleTypeExpression as default};
```

Index Threshold Alert form with validation:
![Index Threshold Alert validation](https://i.imgur.com/TV8c7hL.png)

## Alert type model definition

Each alert type should be defined as `RuleTypeModel` object with the these properties:

```
  id: string;
  name: string;
  iconClass: string;
  validate: (ruleParams: any) => ValidationResult;
  ruleParamsExpression: React.LazyExoticComponent<
        ComponentType<RuleTypeParamsExpressionProps<AlertParamsType>>
      >;
  defaultActionMessage?: string;
```

| Property               | Description                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| id                     | Alert type id. Should be the same as on the server side.                                                                              |
| name                   | Name of the alert type that will be displayed on the select card in the UI.                                                           |
| iconClass              | Icon of the alert type that will be displayed on the select card in the UI.                                                           |
| validate               | Validation function for the alert params.                                                                                             |
| ruleParamsExpression   | A lazy loaded React component for building UI of the current alert type params.                                                       |
| defaultActionMessage   | Optional property for providing default messages for all added actions, excluding the Recovery action group, with `message` property. |
| defaultRecoveryMessage | Optional property for providing a default message for all added actions with `message` property for the Recovery action group.        |
| requiresAppContext     | Define if alert type is enabled for create and edit in the alerting management UI.                                                    |

IMPORTANT: The current UI supports a single action group only.
Action groups are mapped from the server API result for [GET /api/alerts/list_alert_types: List alert types](https://github.com/elastic/kibana/tree/main/x-pack/platform/plugins/shared/alerting#get-apialerttypes-list-alert-types).
Server side alert type model:

```
export interface RuleType {
  id: string;
  name: string;
  validate?: {
    params?: { validate: (object: any) => any };
  };
  actionGroups: string[];
  executor: ({ services, params, state }: RuleExecutorOptions) => Promise<State | void>;
  requiresAppContext: boolean;
}
```

Only the default (which means first item of the array) action group is displayed in the current UI.
Design of user interface and server API for multiple action groups is under discussion and development.

## Register alert type model

There are two ways of registering a new alert type:

1. Directly in the `triggers_actions_ui` plugin. In this case, the alert type will be available in the Create Alert flyout of the Alerts and Actions management section.
   Registration code for a new alert type model should be added to the file `x-pack/platform/plugins/shared/triggers_actions_ui/public/application/components/builtin_alert_types/index.ts`
   Only registered alert types are available in UI.

2. Register the alert type in another plugin. In this case, the alert type will be available only in the current plugin UI.
   It should be done by importing dependency `TriggersAndActionsUIPublicPluginSetup` and adding the next code on plugin setup:

```
function getSomeNewAlertType() {
  return { ... } as RuleTypeModel;
}

triggersActionsUi.ruleTypeRegistry.register(getSomeNewAlertType());
```

## Create and register new alert type UI example

Before registering a UI for a new Alert Type, you should first register the type on the server-side by following the Alerting guide: https://github.com/elastic/kibana/tree/main/x-pack/platform/plugins/shared/alerting#example

Alert type UI is expected to be defined as `RuleTypeModel` object.

Below is a list of steps that should be done to build and register a new alert type with the name `Example Alert Type`:

1. At any suitable place in Kibana, create a file, which will expose an object implementing interface [RuleTypeModel](https://github.com/elastic/kibana/blob/55b7905fb5265b73806006e7265739545d7521d0/x-pack/legacy/plugins/triggers_actions_ui/np_ready/public/types.ts#L83). Example:

```
import { lazy } from 'react';
import { RuleTypeModel } from '../../../../../../types';
import { validateExampleAlertType } from './validation';

export function getAlertType(): RuleTypeModel {
  return {
    id: 'example',
    name: 'Example Alert Type',
    iconClass: 'bell',
    ruleParamsExpression: lazy(() => import('./expression')),
    validate: validateExampleAlertType,
    defaultActionMessage: 'Alert [{{ctx.metadata.name}}] has exceeded the threshold',
    requiresAppContext: false,
  };
}
```

Fields of this object `RuleTypeModel` will be mapped properly in the UI below.

2. Define `ruleParamsExpression` as `React.FunctionComponent` - this is the form for filling Alert params based on the current Alert type.

```
import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { WhenExpression, OfExpression } from '../../../../../../common/expression_items';
import { builtInAggregationTypes } from '../../../../../../common/constants';

interface ExampleProps {
  testAggType?: string;
  testAggField?: string;
  errors: { [key: string]: string[] };
}

export const ExampleExpression: React.FunctionComponent<ExampleProps> = ({
  testAggType,
  testAggField,
  errors,
}) => {
  const [aggType, setAggType] = useState<string>('count');
  return (
    <>
      <EuiFlexGroup gutterSize="s" wrap>
        <EuiFlexItem grow={false}>
          <WhenExpression
            aggType={testAggType ?? 'count'} // defult is 'count'
            onChangeSelectedAggType={(selectedAggType: string) => {
              console.log(`Set alert type params field "aggType" value as ${selectedAggType}`);
              setAggType(selectedAggType);
            }}
          />
        </EuiFlexItem>
        {aggType && builtInAggregationTypes[aggType].fieldRequired ? (
          <EuiFlexItem grow={false}>
            <OfExpression
              aggField={testAggField}
              fields={[{ normalizedType: 'number', name: 'test' }]} // can be some data from server API
              aggType={aggType}
              errors={errors}
              onChangeSelectedAggField={(selectedAggField?: string) =>
                console.log(`Set alert type params field "aggField" value as ${selectedAggField}`)
              }
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </>
  );
};

// Export as default in order to support lazy loading
export {ExampleExpression as default};

```

This alert type form becomes available, when the card of `Example Alert Type` is selected.
Each expression word here is `EuiExpression` component and implements the basic aggregation, grouping and comparison methods.
Expression components, which can be embedded to different alert types, are described here [Common expression components](#common-expression-components).

3. Define alert type params validation using the property of `RuleTypeModel` `validate`:

```
import { i18n } from '@kbn/i18n';
import { ValidationResult } from '../../../../../../types';

export function validateExampleAlertType({
  testAggField,
}: {
  testAggField: string;
}): ValidationResult {
  const validationResult = { errors: {} };
  const errors = {
    aggField: new Array<string>(),
  };
  validationResult.errors = errors;
  if (!testAggField) {
    errors.aggField.push(
      i18n.translate('xpack.triggersActionsUI.components.example.error.requiredTestAggFieldText', {
        defaultMessage: 'Test aggregation field is required.',
      })
    );
  }
  return validationResult;
}
```

4. Extend registration code with the new alert type register in the file `x-pack/platform/plugins/shared/triggers_actions_ui/public/application/components/builtin_alert_types/index.ts`

```
import { getAlertType as getExampledAlertType } from './example';
...

...
ruleTypeRegistry.register(getExampledAlertType());
```

After these four steps, the new `Example Alert Type` is available in UI of Create flyout:
![Example Alert Type is in the select cards list](https://i.imgur.com/j71AEQV.png)

Click on the select card for `Example Alert Type` to open the expression form that was created in step 2:
![Example Alert Type expression with validation](https://i.imgur.com/Z0jIwCS.png)

## Common expression components

### WHEN expression component

![WHEN](https://i.imgur.com/7bYlxXK.png)

```
<WhenExpression
  aggType={aggType ?? DEFAULT_VALUES.AGGREGATION_TYPE}
  onChangeSelectedAggType={(selectedAggType: string) =>
    setRuleParams('aggType', selectedAggType)
  }
/>
```

Props definition:

```
interface WhenExpressionProps {
  aggType: string;
  customAggTypesOptions?: { [key: string]: AggregationType };
  onChangeSelectedAggType: (selectedAggType: string) => void;
  popupPosition?: 'upCenter' | 'upLeft' | 'upRight' | 'downCenter' | 'downLeft'
    | 'downRight' | 'leftCenter' | 'leftUp' | 'leftDown' | 'rightCenter' | 'rightUp' | 'rightDown';
}
```

| Property                | Description                                                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| aggType                 | Selected aggregation type that will be set as the alert type property.                                                                                                         |
| customAggTypesOptions   | (Optional) List of aggregation types that replaces the default options defined in constants `x-pack/platform/plugins/shared/triggers_actions_ui/public/common/constants/aggregation_types.ts`. |
| onChangeSelectedAggType | event handler that will be executed when selected aggregation type is changed.                                                                                                 |
| popupPosition           | (Optional) expression popup position. Default is `downLeft`. Recommend changing it for a small parent window space.                                                            |

### OF expression component

![OF](https://i.imgur.com/4MC8Kbb.png)

OF expression is available, if aggregation type requires selecting data fields for aggregating.

```
<OfExpression
  aggField={aggField}
  fields={esFields}
  aggType={aggType}
  errors={errors}
  onChangeSelectedAggField={(selectedAggField?: string) =>
    setRuleParams('aggField', selectedAggField)
  }
/>
```

Props definition:

```
interface OfExpressionProps {
  aggType: string;
  aggField?: string;
  errors: { [key: string]: string[] };
  onChangeSelectedAggField: (selectedAggType?: string) => void;
  fields: Record<string, any>;
  customAggTypesOptions?: {
    [key: string]: AggregationType;
  };
  popupPosition?: 'upCenter' | 'upLeft' | 'upRight' | 'downCenter' | 'downLeft'
    | 'downRight' | 'leftCenter' | 'leftUp' | 'leftDown' | 'rightCenter' | 'rightUp' | 'rightDown';
}
```

| Property                 | Description                                                                                                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| aggType                  | Selected aggregation type that will be set as the alert type property.                                                                                                         |
| aggField                 | Selected aggregation field that will be set as the alert type property.                                                                                                        |
| errors                   | List of errors with proper messages for the alert params that should be validated. In current component is validated `aggField`.                                               |
| onChangeSelectedAggField | Event handler that will be excuted if selected aggregation field is changed.                                                                                                   |
| fields                   | Fields list that will be available in the OF `Select a field` dropdown.                                                                                                        |
| customAggTypesOptions    | (Optional) List of aggregation types that replaces the default options defined in constants `x-pack/platform/plugins/shared/triggers_actions_ui/public/common/constants/aggregation_types.ts`. |
| popupPosition            | (Optional) expression popup position. Default is `downRight`. Recommend changing it for a small parent window space.                                                           |

### GROUPED BY expression component

![GROUPED BY](https://i.imgur.com/eej7WIw.png)

```
<GroupByExpression
  groupBy={groupBy || DEFAULT_VALUES.GROUP_BY}
  termField={termField}
  termSize={termSize}
  errors={errors}
  fields={esFields}
  onChangeSelectedGroupBy={selectedGroupBy => setRuleParams('groupBy', selectedGroupBy)}
  onChangeSelectedTermField={selectedTermField =>
    setRuleParams('termField', selectedTermField)
  }
  onChangeSelectedTermSize={selectedTermSize =>
    setRuleParams('termSize', selectedTermSize)
  }
/>
```

Props definition:

```
interface GroupByExpressionProps {
  groupBy: string;
  termSize?: number;
  termField?: string | string[];
  errors: { [key: string]: string[] };
  onChangeSelectedTermSize: (selectedTermSize?: number) => void;
  onChangeSelectedTermField: (selectedTermField?: string | string[]) => void;
  onChangeSelectedGroupBy: (selectedGroupBy?: string) => void;
  fields: Record<string, any>;
  customGroupByTypes?: {
    [key: string]: GroupByType;
  };
  popupPosition?: 'upCenter' | 'upLeft' | 'upRight' | 'downCenter' | 'downLeft'
    | 'downRight' | 'leftCenter' | 'leftUp' | 'leftDown' | 'rightCenter' | 'rightUp' | 'rightDown';
}
```

| Property                  | Description                                                                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| groupBy                   | Selected group by type that will be set as the alert type property.                                                                                                      |
| termSize                  | Selected term size that will be set as the alert type property.                                                                                                          |
| termField                 | Selected term field that will be set as the alert type property.                                                                                                         |
| errors                    | List of errors with proper messages for the alert params that should be validated. In current component is validated `termSize` and `termField`.                         |
| onChangeSelectedTermSize  | Event handler that will be executed if selected term size is changed.                                                                                                     |
| onChangeSelectedTermField | Event handler that will be executed if selected term field is changed.                                                                                                    |
| onChangeSelectedGroupBy   | Event handler that will be executed if selected group by is changed.                                                                                                      |
| fields                    | Fields list with options for the `termField` dropdown.                                                                                                                   |
| customGroupByTypes        | (Optional) List of group by types that replaces the default options defined in constants `x-pack/platform/plugins/shared/triggers_actions_ui/public/common/constants/group_by_types.ts`. |
| popupPosition             | (Optional) expression popup position. Default is `downLeft`. Recommend changing it for a small parent window space.                                                      |

### FOR THE LAST expression component

![FOR THE LAST](https://i.imgur.com/vYJTo8F.png)

```
<ForLastExpression
  timeWindowSize={timeWindowSize || 1}
  timeWindowUnit={timeWindowUnit || ''}
  errors={errors}
  onChangeWindowSize={(selectedWindowSize: any) =>
    setRuleParams('timeWindowSize', selectedWindowSize)
  }
  onChangeWindowUnit={(selectedWindowUnit: any) =>
    setRuleParams('timeWindowUnit', selectedWindowUnit)
  }
/>
```

Props definition:

```
interface ForLastExpressionProps {
  timeWindowSize?: number;
  timeWindowUnit?: string;
  errors: { [key: string]: string[] };
  onChangeWindowSize: (selectedWindowSize: number | '') => void;
  onChangeWindowUnit: (selectedWindowUnit: string) => void;
  popupPosition?: 'upCenter' | 'upLeft' | 'upRight' | 'downCenter' | 'downLeft'
    | 'downRight' | 'leftCenter' | 'leftUp' | 'leftDown' | 'rightCenter' | 'rightUp' | 'rightDown';
}
```

| Property           | Description                                                                                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| timeWindowSize     | Selected time window size that will be set as the alert type property.                                                                 |
| timeWindowUnit     | Selected time window unit that will be set as the alert type property.                                                                 |
| errors             | List of errors with proper messages for the alert params that should be validated. In current component is validated `termWindowSize`. |
| onChangeWindowSize | Event handler that will be excuted if selected window size is changed.                                                                 |
| onChangeWindowUnit | Event handler that will be excuted if selected window unit is changed.                                                                 |
| popupPosition      | (Optional) expression popup position. Default is `downLeft`. Recommend changing it for a small parent window space.                    |

### THRESHOLD expression component

![THRESHOLD](https://i.imgur.com/B92ZcT8.png)

```
<ThresholdExpression
  thresholdComparator={thresholdComparator ?? DEFAULT_VALUES.THRESHOLD_COMPARATOR}
  threshold={threshold}
  errors={errors}
  onChangeSelectedThreshold={selectedThresholds =>
    setRuleParams('threshold', selectedThresholds)
  }
  onChangeSelectedThresholdComparator={selectedThresholdComparator =>
    setRuleParams('thresholdComparator', selectedThresholdComparator)
  }
/>
```

Props definition:

```
interface ThresholdExpressionProps {
  thresholdComparator: string;
  errors: { [key: string]: string[] };
  onChangeSelectedThresholdComparator: (selectedThresholdComparator?: string) => void;
  onChangeSelectedThreshold: (selectedThreshold?: number[]) => void;
  customComparators?: {
    [key: string]: Comparator;
  };
  threshold?: number[];
  popupPosition?: 'upCenter' | 'upLeft' | 'upRight' | 'downCenter' | 'downLeft'
    | 'downRight' | 'leftCenter' | 'leftUp' | 'leftDown' | 'rightCenter' | 'rightUp' | 'rightDown';
}
```

| Property                            | Description                                                                                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| thresholdComparator                 | Selected time window size that will be set as the alert type property.                                                                                             |
| threshold                           | Selected time window size that will be set as the alert type property.                                                                                             |
| errors                              | List of errors with proper messages for the alert params that should be validated. In current component is validated `threshold0` and `threshold1`.                |
| onChangeSelectedThresholdComparator | Event handler that will be excuted if selected threshold comparator is changed.                                                                                    |
| onChangeSelectedThreshold           | Event handler that will be excuted if selected threshold is changed.                                                                                               |
| customComparators                   | (Optional) List of comparators that replaces the default options defined in constants `x-pack/platform/plugins/shared/triggers_actions_ui/public/common/constants/comparators.ts`. |
| popupPosition                       | (Optional) expression popup position. Default is `downLeft`. Recommend changing it for a small parent window space.                                                |

## Alert Conditions Components

To aid in creating a uniform UX across Alert Types, we provide two components for specifying the conditions for detection of a certain alert under within any specific Action Groups:

1. `AlertConditions`: A component that generates a container which renders custom component for each Action Group which has had its _conditions_ specified.
2. `AlertConditionsGroup`: A component that provides a unified container for the Action Group with its name and a button for resetting its condition.

These can be used by any Alert Type to easily create the UI for adding action groups along with an Alert Type specific component.

For Example:
Given an Alert Type which requires different thresholds for each detected Action Group (for example), you might have a `ThresholdSpecifier` component for specifying the threshold for a specific Action Group.

```
const ThresholdSpecifier = (
  {
    actionGroup,
    setThreshold
  } : {
    actionGroup?: ActionGroupWithCondition<number>;
    setThreshold: (actionGroup: ActionGroupWithCondition<number>) => void;
}) => {
  if (!actionGroup) {
    // render empty if no condition action group is specified
    return null;
  }

  return (
    <EuiFieldNumber
      value={actionGroup.conditions}
      onChange={(e) => {
        const conditions = parseInt(e.target.value, 10);
        if (e.target.value && !isNaN(conditions)) {
          setThreshold({
            ...actionGroup,
            conditions,
          });
        }
      }}
    />
  );
};

```

This component takes two props, one which is required (`actionGroup`) and one which is alert type specific (`setThreshold`).
The `actionGroup` will be populated by the `AlertConditions` component, but `setThreshold` will have to be provided by the RuleType itself.

To understand how this is used, lets take a closer look at `actionGroup`:

```
type ActionGroupWithCondition<T> = ActionGroup &
  (
    | // allow isRequired=false with or without conditions
    {
        conditions?: T;
        isRequired?: false;
      }
    // but if isRequired=true then conditions must be specified
    | {
        conditions: T;
        isRequired: true;
      }
  )
```

The `condition` field is Alert Type specific, and holds whichever type an Alert Type needs for specifying the condition under which a certain detection falls under that specific Action Group.
In our example, this is a `number` as that's all we need to speciufy the threshold which dictates whether an alert falls into one actio ngroup rather than another.

The `isRequired` field specifies whether this specific action group is _required_, that is, you can't reset its condition and _have_ to specify a some condition for it.

Using this `ThresholdSpecifier` component, we can now use `AlertConditionsGroup` & `AlertConditions` to enable the user to specify these thresholds for each action group in the alert type.

Like so:

```
interface ThresholdAlertTypeParams {
  thresholds?: {
    alert?: number;
    warning?: number;
    error?: number;
  };
}

const DEFAULT_THRESHOLDS: ThresholdAlertTypeParams['threshold] = {
  alert: 50,
  warning: 80,
  error: 90,
};
```

```
<AlertConditions
  headline={'Set different thresholds for each level'}
  actionGroups={[
    {
      id: 'alert',
      name: 'Alert',
      condition: DEFAULT_THRESHOLD
    },
    {
      id: 'warning',
      name: 'Warning',
    },
    {
      id: 'error',
      name: 'Error',
    },
  ]}
  onInitializeConditionsFor={(actionGroup) => {
    setRuleParams('thresholds', {
      ...thresholds,
      ...pick(DEFAULT_THRESHOLDS, actionGroup.id),
    });
  }}
>
  <AlertConditionsGroup
    onResetConditionsFor={(actionGroup) => {
      setRuleParams('thresholds', omit(thresholds, actionGroup.id));
    }}
  >
    <TShirtSelector
      setTShirtThreshold={(actionGroup) => {
        setRuleParams('thresholds', {
          ...thresholds,
          [actionGroup.id]: actionGroup.conditions,
        });
      }}
    />
  </AlertConditionsGroup>
</AlertConditions>
```

### The AlertConditions component

This component will render the `Conditions` header & headline, along with the selectors for adding every Action Group you specity.
Additionally it will clone its `children` for _each_ action group which has a `condition` specified for it, passing in the appropriate `actionGroup` prop for each one.

| Property                  | Description                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| headline                  | The headline title displayed above the fields                                                                                                                                                                                                                                                                                                                                                 |
| actionGroups              | A list of `ActionGroupWithCondition` which includes all the action group you wish to offer the user and what conditions they are already configured to follow                                                                                                                                                                                                                                 |
| onInitializeConditionsFor | A callback which is called when the user ask for a certain actionGroup to be initialized with an initial default condition. If you have no specific default, that's fine, as the component will render the action group's field even if the condition is empty (using a `null` or an `undefined`) and determines whether to render these fields by _the very presence_ of a `condition` field |

### The AlertConditionsGroup component

This component renders a standard EuiTitle foe each action group, wrapping the Alert Type specific component, in addition to a "reset" button which allows the user to reset the condition for that action group. The definition of what a _reset_ actually means is Alert Type specific, and up to the implementor to decide. In some case it might mean removing the condition, in others it might mean to reset it to some default value on the server side. In either case, it should _delete_ the `condition` field from the appropriate `actionGroup` as per the above example.

| Property             | Description                                                                                                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| onResetConditionsFor | A callback which is called when the user clicks the _reset_ button besides the action group's title. The implementor should use this to remove the `condition` from the specified actionGroup |

## Embed the Create Alert flyout within any Kibana plugin

Follow the instructions bellow to embed the Create Alert flyout within any Kibana plugin:

1. Add TriggersAndActionsUIPublicPluginStart to Kibana plugin setup dependencies:

```
triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
```

Then this dependency will be used to embed Create Alert flyout.

2. Add Create Alert flyout to React component using triggersActionsUi start contract:

```
// in the component state definition section
const [alertFlyoutVisible, setAlertFlyoutVisibility] = useState<boolean>(false);

// UI control item for open flyout
<EuiButton
  fill
  iconType="plusInCircle"
  iconSide="left"
  onClick={() => setAlertFlyoutVisibility(true)}
>
  <FormattedMessage
    id="emptyButton"
    defaultMessage="Create alert"
  />
</EuiButton>

const AddAlertFlyout = useMemo(
    () =>
      triggersActionsUi.getAddRuleFlyout({
        consumer: ALERTING_EXAMPLE_APP_ID,
        addFlyoutVisible: alertFlyoutVisible,
        setAddFlyoutVisibility: setAlertFlyoutVisibility,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [alertFlyoutVisible]
);

// in render section of component
  return <>{AddAlertFlyout}</>;
```

getAddRuleFlyout variables definition:

```
interface RuleAddProps {
  consumer: string;
  addFlyoutVisible: boolean;
  setAddFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
  alertTypeId?: string;
  canChangeTrigger?: boolean;
  initialValues?: Partial<Alert>;
  onSave?: () => Promise<void>;
  metadata?: MetaData;
}
```

| Property               | Description                                                                                                                                                                   |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| consumer               | Name of the plugin that creates an alert.                                                                                                                                     |
| addFlyoutVisible       | Visibility state of the Create Alert flyout.                                                                                                                                  |
| setAddFlyoutVisibility | Function for changing visibility state of the Create Alert flyout.                                                                                                            |
| alertTypeId            | Optional property to preselect alert type.                                                                                                                                    |
| canChangeTrigger       | Optional property, that hides change alert type possibility.                                                                                                                  |
| onSave                 | Optional function, which will be executed if alert was saved sucsessfuly.                                                                                                     |
| initialValues          | Default values for Alert properties.                                                                                                                                          |
| metadata               | Optional generic property, which allows to define component specific metadata. This metadata can be used for passing down preloaded data for Alert type expression component. |

## Build and register Action Types

Kibana ships with a set of built-in action types UI:

| Type                      | Id           | Description                                                            |
| ------------------------- | ------------ | ---------------------------------------------------------------------- |
| [Server log](#server-log) | `.log`       | Logs messages to the Kibana log using `server.log()`                   |
| [Email](#email)           | `.email`     | Sends an email using SMTP                                              |
| [Slack](#slack)           | `.slack`     | Posts a message to a Slack channel                                     |
| [Index](#index)           | `.index`     | Indexes document(s) into Elasticsearch                                 |
| [Webhook](#webhook)       | `.webhook`   | Sends a payload to a web service using HTTP POST or PUT                |
| [PagerDuty](#pagerduty)   | `.pagerduty` | Triggers, resolves, or acknowledges an incident to a PagerDuty service |

Every action type should be registered server side, and can be optionally registered client side.
Only action types registered on both client and server will be displayed in the Alerts and Actions UI.
Built-in action types UI is located under the folder `x-pack/platform/plugins/shared/triggers_actions_ui/public/application/components/builtin_action_types`
and this is a file `x-pack/platform/plugins/shared/triggers_actions_ui/public/application/components/builtin_action_types/index.ts` for client side registration.

### Server log

Action type model definition:

```
export function getActionType(): ActionTypeModel {
  return {
    id: '.server-log',
    iconClass: 'logsApp',
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.serverLogAction.selectMessageText',
      {
        defaultMessage: 'Add a message to a Kibana log.',
      }
    ),
    actionTypeTitle: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.serverLogAction.actionTypeTitle',
      {
        defaultMessage: 'Send to Server log',
      }
    ),
    validateParams: (actionParams: ServerLogActionParams): Promise<ValidationResult> => {
      // validation of action params implementation
    },
    actionConnectorFields: null,
    actionParamsFields: ServerLogParamsFields,
  };
}
```

Server log has a connector UI:

![Server log connector card](https://i.imgur.com/ZIWhV89.png)

![Server log connector form](https://i.imgur.com/rkc3U59.png)

and action params form available in Create Alert form:
![Server log action form](https://i.imgur.com/c0ds76T.png)

### Email

Action type model definition:

```
export function getActionType(): ActionTypeModel {
  const mailformat = /^[^@\s]+@[^@\s]+$/;
  return {
    id: '.email',
    iconClass: 'email',
    selectMessage: i18n.translate(
      'xpack.stackConnectors.components.email.selectMessageText',
      {
        defaultMessage: 'Send email from your server.',
      }
    ),
    actionTypeTitle: i18n.translate(
      'xpack.stackConnectors.components.email.connectorTypeTitle',
      {
        defaultMessage: 'Send to email',
      }
    ),
    validateParams: (actionParams: EmailActionParams): Promise<ValidationResult> => {
      // validation of action params implementation
    },
    actionConnectorFields: EmailActionConnectorFields,
    actionParamsFields: EmailParamsFields,
  };
}
```

![Email connector card](https://i.imgur.com/d8kCbjQ.png)

![Email connector form](https://i.imgur.com/Uf6HU7X.png)

and action params form available in Create Alert form:
![Email action form](https://i.imgur.com/lhkUEHf.png)

### Slack

Action type model definition:

```
export function getActionType(): ActionTypeModel {
  return {
    id: '.slack',
    iconClass: 'logoSlack',
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.slackAction.selectMessageText',
      {
        defaultMessage: 'Send messages to Slack channels.',
      }
    ),
    actionTypeTitle: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.slackAction.actionTypeTitle',
      {
        defaultMessage: 'Send to Slack',
      }
    ),
    validateParams: (actionParams: SlackActionParams): Promise<ValidationResult> => {
      // validation of action params implementation
    },
    actionConnectorFields: SlackActionFields,
    actionParamsFields: SlackParamsFields,
  };
}
```

![Slack connector card](https://i.imgur.com/JbvmNOy.png)

![Slack connector form](https://i.imgur.com/IqdnmF9.png)

and action params form available in Create Alert form:
![Slack action form](https://i.imgur.com/GUEVZWK.png)

### Index

Action type model definition:

```
export function getActionType(): ActionTypeModel {
  return {
    id: '.index',
    iconClass: 'indexOpen',
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.indexAction.selectMessageText',
      {
        defaultMessage: 'Index data into Elasticsearch.',
      }
    ),
    actionConnectorFields: IndexActionConnectorFields,
    actionParamsFields: IndexParamsFields,
    validateParams: (): Promise<ValidationResult> => {
      return { errors: {} };
    },
  };
}
```

![Index connector card](https://i.imgur.com/fflsmu5.png)

![Index connector form](https://i.imgur.com/IkixGMV.png)

and action params form available in Create Alert form:
![Index action form](https://i.imgur.com/mpxnPOF.png)

Example of the index document for Index Threshold alert:

```
{
    "rule_id": "{{rule.id}}",
    "rule_name": "{{rule.name}}",
    "alert_id": "{{alert.id}}",
    "context_title": "{{context.title}}",
    "context_value": "{{context.value}}",
    "context_message": "{{context.message}}"
}
```

### Webhook

Action type model definition:

```
export function getActionType(): ActionTypeModel {
  return {
    id: '.webhook',
    iconClass: 'logoWebhook',
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.selectMessageText',
      {
        defaultMessage: 'Send a request to a web service.',
      }
    ),
    validateParams: (actionParams: WebhookActionParams): Promise<ValidationResult> => {
      // validation of action params implementation
    },
    actionConnectorFields: WebhookActionConnectorFields,
    actionParamsFields: WebhookParamsFields,
  };
}
```

![Webhook connector card](https://i.imgur.com/IBgn75T.png)

![Webhook connector form](https://i.imgur.com/xqORAJ7.png)

and action params form available in Create Alert form:
![Webhook action form](https://i.imgur.com/mBGfeuC.png)

### PagerDuty

Action type model definition:

```
export function getActionType(): ActionTypeModel {
  return {
    id: '.pagerduty',
    iconClass: lazy(() => import('./logo')),
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.selectMessageText',
      {
        defaultMessage: 'Send an event in PagerDuty.',
      }
    ),
    actionTypeTitle: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.actionTypeTitle',
      {
        defaultMessage: 'Send to PagerDuty',
      }
    ),
    validateParams: (actionParams: PagerDutyActionParams): Promise<ValidationResult> => {
      // validation of action params implementation
    },
    actionConnectorFields: PagerDutyActionConnectorFields,
    actionParamsFields: PagerDutyParamsFields,
  };
}
```

![PagerDuty connector card](https://i.imgur.com/Br8MuKG.png)

![PagerDuty connector form](https://i.imgur.com/DZpCfRv.png)

and action params form available in Create Alert form:
![PagerDuty action form](https://i.imgur.com/xxXmhMK.png)

} 
```

### D3Security

Action type model definition:
```
export function getActionType(): ActionTypeModel {
  return {
    id: '.d3security',
    iconClass: lazy(() => import('./logo')),
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.D3SecurityAction.selectMessageText',
      {
        defaultMessage: 'Create event or trigger playbook workflow actions in D3 SOAR.',
      }
    ),
    validateParams: (actionParams: D3ActionParams): Promise<ValidationResult> => {
      // validation of action params implementation
    },
    actionConnectorFields: D3SecurityActionConnectorFields,
    actionParamsFields: D3SecurityParamsFields,
  };
}
```

![D3Security connector card](https://i.imgur.com/pbmXBVy.png)

![D3security connector form](https://i.imgur.com/HEUF6qC.png)

and action params form available in Create Alert form:

![D3Security action form](https://i.imgur.com/wIPjkbp.png)

## Action type model definition

Each action type should be defined as an `ActionTypeModel` object with the following properties:

```
  id: string;
  iconClass: IconType;
  selectMessage: string;
  actionTypeTitle?: string;
  validateParams: (actionParams: any) => Promise<ValidationResult>;
  actionConnectorFields: React.FunctionComponent<any> | null;
  actionParamsFields: React.LazyExoticComponent<ComponentType<ActionParamsProps<ActionParams>>>;
  customConnectorSelectItem?: CustomConnectorSelectionItem;
```

| Property                  | Description                                                                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| id                        | Action type id. Should be the same as on server side.                                                                                   |
| iconClass                 | Setting for icon to be displayed to the user. EUI supports any known EUI icon, SVG URL, or a lazy loaded React component, ReactElement. |
| selectMessage             | Short description of action type responsibility, that will be displayed on the select card in UI.                                       |
| validateParams            | Validation function for action params.                                                                                                  |
| actionConnectorFields     | A lazy loaded React component for building UI of current action type connector.                                                         |
| actionParamsFields        | A lazy loaded React component for building UI of current action type params. Displayed as a part of Create Alert flyout.                |
| customConnectorSelectItem | Optional, an object for customizing the selection row of the action connector form.                                                     |

### CustomConnectorSelectionItem Properties

```
  getText: (connector: ActionConnector) => string;
  getComponent: (connector: ActionConnector) => React.
    LazyExoticComponent<ComponentType<{ actionConnector: ActionConnector }> | undefined;
```

| Property     | Description                                                                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| getText      | Function for returning the text to display for the row.                                                                                                             |
| getComponent | Function for returning a lazy loaded React component for customizing the selection row of the action connector form. Or undefined if if no customization is needed. |

## Register action type model

There are two ways to register a new action type UI:

1. Directly in `triggers_actions_ui` plugin. In this case, the action type will be available in the Alerts and Actions management section.
   Registration code for a new action type model should be added to the file `x-pack/platform/plugins/shared/triggers_actions_ui/public/application/components/builtin_action_types/index.ts`
   Only registered action types are available in UI.

2. Register action type in another plugin. In this case, the action type will be available only in the current plugin UI.
   It should be done by importing dependency `TriggersAndActionsUIPublicPluginSetup` and adding the next code on plugin setup:

```
function getSomeNewActionType() {
  return { ... } as ActionTypeModel;
}

triggersActionsUi.actionTypeRegistry.register(getSomeNewActionType());
```

## Create and register new action type UI

Before starting the UI implementation, the [server side registration](https://github.com/elastic/kibana/tree/main/x-pack/platform/plugins/shared/actions#action-types) should be done first.

Action type UI is expected to be defined as `ActionTypeModel` object.

The framework uses the [Form lib](https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/es_ui_shared/static/forms/docs/welcome.mdx). Please refer to the documentation of the library to learn more.

Below is a list of steps that should be done to build and register a new action type with the name `Example Action Type`:

1. At any suitable place in Kibana, create a file, which will expose an object implementing interface [ActionTypeModel]:

```
import React, { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import {
  ActionTypeModel,
  ValidationResult,
  ActionConnectorFieldsProps,
  ActionParamsProps,
} from '../../../../../types';

interface ExampleActionParams {
  message: string;
}

export function getActionType(): ActionTypeModel {
  return {
    id: '.example-action',
    iconClass: 'logoGmail',
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.exampleAction.selectMessageText',
      {
        defaultMessage: 'Example Action is used to show how to create new action type UI.',
      }
    ),
    actionTypeTitle: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.exampleAction.actionTypeTitle',
      {
        defaultMessage: 'Example Action',
      }
    ),
    validateParams: (actionParams: ExampleActionParams): Promise<ValidationResult> => {
      const validationResult = { errors: {} };
      const errors = {
        message: new Array<string>(),
      };
      validationResult.errors = errors;
      if (!actionParams.message?.length) {
        errors.message.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredExampleMessageText',
            {
              defaultMessage: 'Message is required.',
            }
          )
        );
      }
      return validationResult;
    },
    actionConnectorFields: lazy(() => import('./example_connector_fields')),
    actionParamsFields: lazy(() => import('./example_params_fields')),
  };
}
```

2. Define `actionConnectorFields` as `React.FunctionComponent` - this is the form for action connector.

```
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FieldConfig, UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { TextField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { ActionConnectorFieldsProps } from '../../../../../types';

const { emptyField } = fieldValidators;

const fieldConfig: FieldConfig = {
  label: 'My field',
  validations: [
    {
      validator: emptyField(
        i18n.translate(
          'xpack.triggersActionsUI.sections.actionConnectorForm.error.requiredField',
          {
            defaultMessage: 'Field is required.',
          }
        )
      ),
    },
  ],
};

const ExampleConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({ isEdit, readOnly, registerPreSubmitValidator }) => {
  return (
    <UseField
        path="config.someConnectorField"
        component={TextField}
        config={fieldConfig}
        componentProps={{
          euiFieldProps: { readOnly: !canSave, 'data-test-subj': 'someTestId', fullWidth: true },
        }}
      />
  );
};

// Export as default in order to support lazy loading
export {ExampleConnectorFields as default};
```

3. Define action type params fields using the property of `ActionTypeModel` `actionParamsFields`:

```
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFieldText } from '@elastic/eui';
import { EuiTextArea } from '@elastic/eui';
import {
  ActionTypeModel,
  ValidationResult,
  ActionConnectorFieldsProps,
  ActionParamsProps,
} from '../../../../../types';

interface ExampleActionParams {
  message: string;
}

const ExampleParamsFields: React.FunctionComponent<ActionParamsProps<ExampleActionParams>> = ({
  actionParams,
  editAction,
  index,
  errors,
}) => {
  const { message } = actionParams;
  return (
    <>
      <EuiTextArea
        fullWidth
        isInvalid={errors.message.length > 0 && message !== undefined}
        name="message"
        value={message || ''}
        onChange={e => {
          editAction('message', e.target.value, index);
        }}
        onBlur={() => {
          if (!message) {
            editAction('message', '', index);
          }
        }}
      />
    </>
  );
};

// Export as default in order to support lazy loading
export {ExampleParamsFields as default};
```

4. Extend registration code with the new action type register in the file `x-pack/platform/plugins/shared/triggers_actions_ui/public/application/components/builtin_action_types/index.ts`

```
import { getActionType as getExampledActionType } from './example';
...

...
actionTypeRegistry.register(getExampledActionType());
```

After these four steps, the new `Example Action Type` is available in UI of Create connector:
![Example Action Type is in the select cards list](https://i.imgur.com/PTYdBos.png)

Clicking on the select card for `Example Action Type` will open the connector form that was created in step 2:
![Example Action Type connector](https://i.imgur.com/KdxAXAs.png)

Example Action Type is in the select cards list of Create Alert flyout:
![Example Action Type is in the select cards list of Create Alert flyout](https://i.imgur.com/CSRBkFe.png)

Clicking on the select card for `Example Action Type` will open the action type Add Action form:
![Example Action Type with existing connectors list](https://i.imgur.com/8FA3NAW.png)

or create a new connector:
![Example Action Type with empty connectors list](https://i.imgur.com/EamA9Xv.png)

## Embed the Alert Actions form within any Kibana plugin

Follow the instructions bellow to embed the Alert Actions form within any Kibana plugin:

1. Add TriggersAndActionsUIPublicPluginSetup and TriggersAndActionsUIPublicPluginStart to Kibana plugin setup dependencies:

```
import {
   TriggersAndActionsUIPublicPluginSetup,
   TriggersAndActionsUIPublicPluginStart,
 } from '@kbn/triggers-actions-ui-plugin/public';

triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
...

triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
```

Then this dependencies will be used to embed Actions form or register your own action type.

2. Add Actions form to React component:

```
import React, { useCallback } from 'react';
import { ActionForm } from '@kbn/triggers-actions-ui-plugin/public';
import { RuleAction } from '@kbn/triggers-actions-ui-plugin/public/types';

export const ComponentWithActionsForm: () => {
  const { http, triggersActionsUi, notifications } = useKibana().services;
  const actionTypeRegistry = triggersActionsUi.actionTypeRegistry;
  const initialAlert = ({
    name: 'test',
    params: {},
    consumer: 'alerts',
    alertTypeId: '.index-threshold',
    schedule: {
      interval: '1m',
    },
    actions: [
      {
        group: 'default',
        id: 'test',
        actionTypeId: '.index',
        params: {
          message: '',
        },
      },
    ],
    tags: [],
    muteAll: false,
    enabled: false,
    mutedInstanceIds: [],
  } as unknown) as Alert;

  return (
    <ActionForm
      actions={initialAlert.actions}
      messageVariables={[ { name: 'testVar1', description: 'test var1' } ]}
      defaultActionGroupId={'default'}
      setActionIdByIndex={(id: string, index: number) => {
        initialAlert.actions[index].id = id;
      }}
      setRuleProperty={(_updatedActions: RuleAction[]) => {}}
      setActionParamsProperty={(key: string, value: any, index: number) =>
        (initialAlert.actions[index] = { ...initialAlert.actions[index], [key]: value })
      }
      http={http}
      actionTypeRegistry={actionTypeRegistry}
      defaultActionMessage={'Alert [{{ctx.metadata.name}}] has exceeded the threshold'}
      featureId="alerting"
      toastNotifications={notifications.toasts}
      consumer={initialAlert.consumer}
    />
  );
};
```

ActionForm Props definition:

```
interface ActionAccordionFormProps {
  actions: RuleAction[];
  defaultActionGroupId: string;
  actionGroups?: ActionGroup[];
  setActionIdByIndex: (id: string, index: number) => void;
  setActionGroupIdByIndex?: (group: string, index: number) => void;
  setRuleProperty: (actions: RuleAction[]) => void;
  setActionParamsProperty: (key: string, value: any, index: number) => void;
  http: HttpSetup;
  actionTypeRegistry: ActionTypeRegistryContract;
  toastNotifications: ToastsSetup;
  docLinks: DocLinksStart;
  featureId: string;
  messageVariables?: ActionVariable[];
  defaultActionMessage?: string;
  capabilities: ApplicationStart['capabilities'];
}

```

| Property                | Description                                                                                                                                                                                                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| actions                 | List of actions comes from alert.actions property.                                                                                                                                                                                                                |
| defaultActionGroupId    | Default action group id to which each new action will belong by default.                                                                                                                                                                                          |
| actionGroups            | Optional. List of action groups to which new action can be assigned. The RunWhen field is only displayed when these action groups are specified                                                                                                                   |
| setActionIdByIndex      | Function for changing action 'id' by the proper index in alert.actions array.                                                                                                                                                                                     |
| setActionGroupIdByIndex | Function for changing action 'group' by the proper index in alert.actions array.                                                                                                                                                                                  |
| setRuleProperty         | Function for changing alert property 'actions'. Used when deleting action from the array to reset it.                                                                                                                                                             |
| setActionParamsProperty | Function for changing action key/value property by index in alert.actions array.                                                                                                                                                                                  |
| http                    | HttpSetup needed for executing API calls.                                                                                                                                                                                                                         |
| actionTypeRegistry      | Registry for action types.                                                                                                                                                                                                                                        |
| toastNotifications      | Toast messages Plugin Setup Contract.                                                                                                                                                                                                                             |
| docLinks                | Documentation links Plugin Start Contract.                                                                                                                                                                                                                        |
| featureId               | Property that filters which action types are loaded when the flyout is opened. Each action type configures the feature ids it is available in during [server side registration](https://github.com/elastic/kibana/tree/main/x-pack/platform/plugins/shared/actions#action-types). |
| messageVariables        | Optional property, which allows to define a list of variables for action 'message' property. Set `useWithTripleBracesInTemplates` to true if you don't want the variable escaped when rendering.                                                                  |
| defaultActionMessage    | Optional property, which allows to define a message value for action with 'message' property.                                                                                                                                                                     |
| capabilities            | Kibana core's Capabilities ApplicationStart['capabilities'].                                                                                                                                                                                                      |

| Property           | Description                                                                                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| onSave             | Optional function, which will be executed if alert was saved sucsessfuly.                                                              |
| http               | HttpSetup needed for executing API calls.                                                                                              |
| ruleTypeRegistry   | Registry for alert types.                                                                                                              |
| actionTypeRegistry | Registry for action types.                                                                                                             |
| uiSettings         | Optional property, which is needed to display visualization of alert type expression. Will be changed after visualization refactoring. |
| docLinks           | Documentation Links, needed to link to the documentation from informational callouts.                                                  |
| toastNotifications | Toast messages.                                                                                                                        |
| charts             | Optional property, which is needed to display visualization of alert type expression. Will be changed after visualization refactoring. |
| dataFieldsFormats  | Optional property, which is needed to display visualization of alert type expression. Will be changed after visualization refactoring. |

## Embed the Create Connector flyout within any Kibana plugin

Follow the instructions bellow to embed the Create Connector flyout within any Kibana plugin:

1. Add TriggersAndActionsUIPublicPluginSetup and TriggersAndActionsUIPublicPluginStart to Kibana plugin setup dependencies:

```
import {
   TriggersAndActionsUIPublicPluginSetup,
   TriggersAndActionsUIPublicPluginStart,
 } from '@kbn/triggers-actions-ui-plugin/public';

triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
...

triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
```

Then this dependency will be used to embed Create Connector flyout or register new action type.

2. Add Create Connector flyout to React component:

```
// import section
import { ActionsConnectorsContextProvider, CreateConnectorFlyout } from '@kbn/triggers-actions-ui-plugin/public';

// in the component state definition section
const [addFlyoutVisible, setAddFlyoutVisibility] = useState<boolean>(false);
const onClose = useCallback(() => setAddFlyoutVisibility(false), []);

// load required dependancies
const { http, triggersActionsUi, notifications, application, docLinks } = useKibana().services;

const connector = {
  secrets: {},
  id: 'test',
  actionTypeId: '.index',
  actionType: 'Index',
  name: 'action-connector',
  referencedByCount: 0,
  config: {},
};

// UI control item for open flyout
<EuiButton
  fill
  iconType="plusInCircle"
  iconSide="left"
  onClick={() => setAddFlyoutVisibility(true)}
>
  <FormattedMessage
    id="emptyButton"
    defaultMessage="Create connector"
  />
</EuiButton>

// in render section of component
<CreateConnectorFlyout
  actionTypeRegistry={triggersActionsUi.actionTypeRegistry}
  onClose={onClose}
  setAddFlyoutVisibility={setAddFlyoutVisibility}
/>
```

CreateConnectorFlyout Props definition:

```
export interface ConnectorAddFlyoutProps {
  actionTypeRegistry: ActionTypeRegistryContract;
  onClose: () => void;
  featureId?: string;
  onConnectorCreated?: (connector: ActionConnector) => void;
  onTestConnector?: (connector: ActionConnector) => void;
}
```

| Property           | Description                                                                                                                                                                                                                                                                |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| actionTypeRegistry | The action type registry.                                                                                                                                                                                                                                                  |
| onClose            | Called when closing the flyout                                                                                                                                                                                                                                             |
| featureId          | Optional property that filters which action types are loaded when the flyout is opened. Each action type configures the feature ids it is available in during [server side registration](https://github.com/elastic/kibana/tree/main/x-pack/platform/plugins/shared/actions#action-types). |
| onConnectorCreated | Optional property. Function to be called after the creation of the connector.                                                                                                                                                                                              |
| onTestConnector    | Optional property. Function to be called when the user press the Save & Test button.                                                                                                                                                                                       |

## Embed the Edit Connector flyout within any Kibana plugin

Follow the instructions bellow to embed the Edit Connector flyout within any Kibana plugin:

1. Add TriggersAndActionsUIPublicPluginSetup and TriggersAndActionsUIPublicPluginStart to Kibana plugin setup dependencies:

```
import {
   TriggersAndActionsUIPublicPluginSetup,
   TriggersAndActionsUIPublicPluginStart,
 } from '@kbn/triggers-actions-ui-plugin/public';

triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
...

triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
```

Then this dependency will be used to embed Edit Connector flyout.

2. Add Create Connector flyout to React component:

```
// import section
import { ActionsConnectorsContextProvider, EditConnectorFlyout } from '@kbn/triggers-actions-ui-plugin/public';

// in the component state definition section
const [editFlyoutVisible, setEditFlyoutVisibility] = useState<boolean>(false);

// load required dependancied
const { http, triggersActionsUi, notifications, application } = useKibana().services;

// UI control item for open flyout
<EuiButton
  fill
  iconType="plusInCircle"
  iconSide="left"
  onClick={() => setEditFlyoutVisibility(true)}
>
  <FormattedMessage
    id="emptyButton"
    defaultMessage="Edit connector"
  />
</EuiButton>

// in render section of component
        <EditConnectorFlyout
          actionTypeRegistry={triggersActionsUi.actionTypeRegistry}
          connector={editedConnectorItem}
          onClose={onCloseEditFlyout}
          onConnectorUpdated={reloadConnectors}
        />

```

EditConnectorFlyout Props definition:

```
export interface ConnectorEditProps {
  actionTypeRegistry: ActionTypeRegistryContract;
  connector: ActionConnector;
  onClose: () => void;
  tab?: EditConnectorTabs;
  onConnectorUpdated?: (connector: ActionConnector) => void;
}
```

| Property           | Description                                                                 |
| ------------------ | --------------------------------------------------------------------------- |
| actionTypeRegistry | The action type registry.                                                   |
| connector          | Property, that allows to define the initial state of edited connector.      |
| onClose            | Called when closing the flyout                                              |
| onConnectorUpdated | Optional property. Function to be called after the update of the connector. |

ActionsConnectorsContextValue options:

```
export interface ActionsConnectorsContextValue {
  http: HttpSetup;
  actionTypeRegistry: TypeRegistry<ActionTypeModel>;
  toastNotifications: Pick<
    ToastsApi,
    'get$' | 'add' | 'remove' | 'addSuccess' | 'addWarning' | 'addDanger' | 'addError'
  >;
  capabilities: ApplicationStart['capabilities'];
  reloadConnectors?: () => Promise<void>;
}
```

| Property           | Description                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| http               | HttpSetup needed for executing API calls.                                                                     |
| actionTypeRegistry | Registry for action types.                                                                                    |
| capabilities       | Property, which is defining action current user usage capabilities like canSave or canDelete.                 |
| toastNotifications | Toast messages.                                                                                               |
| reloadConnectors   | Optional function, which will be executed if connector was saved sucsessfuly, like reload list of connecotrs. |
