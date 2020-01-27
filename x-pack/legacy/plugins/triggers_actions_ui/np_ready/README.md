# Kibana Alerts and Actions UI

The Kibana alerts and actions UI plugin provides a user interface for managing alerts and actions. 
As a developer you can:

- Create and register own alert type which will be integrated to the current user interface: Create Alert flyout, Alerts management page.
- Create and register a custom action type (TBD)

-----


Table of Contents

- [Kibana Alerts and Actions UI](#kibana-alerts-and-actions-ui)
  - [Built-in Alert Types](#built-in-alert-types)
    - [Index Threshold Alert](#index-threshold-alert)
  - [Built-in Action Types](#built-in-action-types)
  - [Create and register new alert type UI](#create-and-register-new-alert-type-ui)
  - [Create and register new action type UI](#register-action-type)

## Built-in Alert Types

Kibana ships with a built-in alert types:

|Type|Id|Description|
|---|---|---|
|[Index Threshold](#index-threshold-alert)|`threshold`|Index Threshold Alert|

All built-in alert types is located under the folder `x-pack/legacy/plugins/triggers_actions_ui/np_ready/public/application/components/builtin_alert_types`
and the registration file is `x-pack/legacy/plugins/triggers_actions_ui/np_ready/public/application/components/builtin_alert_types/index.ts`

### Index Threshold Alert

ID: `threshold`

In Create Alert flyout available registered alert types appears as a list of select cards:
![Index Threshold select card in UI](https://i.imgur.com/hWm6Pdb.png)

AlertTypeModel:

```
export function getAlertType(): AlertTypeModel {
  return {
    id: 'threshold',
    name: 'Index Threshold',
    iconClass: 'alert',
    alertParamsExpression: IndexThresholdAlertTypeExpression,
    validate: validateAlertType,
  };
}
```
(TBD)

# Create and register new alert type UI

To be able to add UI for a new Alert type the proper server API https://github.com/elastic/kibana/tree/master/x-pack/legacy/plugins/alerting#example recommended to be done first.

Alert type UI is expected to be defined as `AlertTypeModel` object.

To build and register a new alert type follow the next steps:

1. At any suitable place in Kibana create a file, which will expose an object implementing interface [AlertTypeModel](https://github.com/elastic/kibana/blob/55b7905fb5265b73806006e7265739545d7521d0/x-pack/legacy/plugins/triggers_actions_ui/np_ready/public/types.ts#L83). Example:
```export function getAlertType(): AlertTypeModel {
  return {
    id: 'custom',
    name: 'Custom Alert',
    iconClass: 'alert',
    alertParamsExpression: CustomAlertTypeExpression,
    validate: validateAlertType,
  };
}
```
Fields of this object `AlertTypeModel` will be mapped properly in UI:
![AlertTypeModel properties in select card in UI](https://i.imgur.com/RLr8kmh.png)
Action groups is mapped from server API result for [GET /api/alert/types: List alert types](https://github.com/elastic/kibana/tree/master/x-pack/legacy/plugins/alerting#get-apialerttypes-list-alert-types).

2. Define `alertParamsExpression` as `React.FunctionComponent` - this will be the form for filling Alert params based on the current Alert type.
If the card of alert type is selected, the alert type form becomes available.
For Index Threshold Alert, form represented as an expression using `EuiExpression`, but it could be introdused differently up to the requirenments:
![Index Threshold Alert expression form](https://i.imgur.com/iiyh4gC.png)
Each expression word is defined as `EuiExpression` component and implement the basic aggregation, 
grouping and comparison methods - all of this is currently a part of Index Threshold `alertParamsExpression` React component.
Exposing of ES indexes and fields is a part of Index Threshold alert type server API.

3. Define form validation using the property of `AlertTypeModel` `validate`, which expect: 
```
(alert: Alert) => ValidationResult;
```
![Index Threshold Alert validation](https://i.imgur.com/NWo78vl.png)

4. Extend registration code with the new alert type register in the file `x-pack/legacy/plugins/triggers_actions_ui/np_ready/public/application/components/builtin_alert_types/index.ts`
```
import { getAlertType as getCustomAlertType } from '../../../some/plugin/custom_alert_type';
...
alertTypeRegistry.register(getCustomAlertType());
```


