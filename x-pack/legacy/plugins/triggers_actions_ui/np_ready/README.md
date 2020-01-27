# Kibana Alerts and Actions UI

The Kibana alerts and actions UI plugin provides a user interface for managing alerts and actions functionality. 
As a developer you can:

- Create and register own alert type which will be integrated to the current user interface: Create Alert flyout, Alerts management page.
- Create and register a custom action type

-----


Table of Contents

- [Kibana Alerts and Actions UI](#kibana-alerts-and-actions-ui)
  - [Built-in Alert Types](#built-in-alert-types)
    - [Index Threshold Alert](#index-threshold-alert)
  - [Built-in Action Types](#built-in-action-types)
  - [Create and register new alert type UI](#register-alert-type)
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

# Create and register new alert type UI

To be able to add the UI part for a new Alert type, first should be implemented proper server API https://github.com/elastic/kibana/tree/master/x-pack/legacy/plugins/alerting#example 
Alert type UI is expected to be defined as `AlertTypeModel` object.

For build and register a new one should be done the next steps:

1. In any suitable place in Kibana create a file which will expose an object [AlertTypeModel](https://github.com/elastic/kibana/blob/55b7905fb5265b73806006e7265739545d7521d0/x-pack/legacy/plugins/triggers_actions_ui/np_ready/public/types.ts#L83):
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
In UI next `AlertTypeModel` object properties will be mapped:
![AlertTypeModel properties in select card in UI](https://i.imgur.com/RLr8kmh.png)
Action groups is not a propertie of AlertTypeModel itself, but is part of server API return result for [GET /api/alert/types: List alert types](https://github.com/elastic/kibana/tree/master/x-pack/legacy/plugins/alerting#get-apialerttypes-list-alert-types)
2. Define alertParamsExpression as `React.FunctionComponent` - this will be the form for populationg Alert params based on the Alerts type.
If the card of alert type is selected, the alert type form become available.
For Index Threshold Alert it looks like an expression representation using `EuiExpression`, but it could be introdused differently up to the requirenments:
![Index Threshold Alert expression form](https://i.imgur.com/iiyh4gC.png)
Each expression word is defined as `EuiExpression` component and implement the basic agregation, 
groupping and comparation methods with is currently a part of Index Threshold `alertParamsExpression` React component.
Retriving ES indexes and fields here is a part of alert type server API.
3. Define form validation using the property of `AlertTypeModel` `validate`, which expect: 
```
(alert: Alert) => ValidationResult;
```
4. Extend registration code with the new alert type register in the file `x-pack/legacy/plugins/triggers_actions_ui/np_ready/public/application/components/builtin_alert_types/index.ts`
```
import { getAlertType as getCustomAlertType } from '../../../some/plugin/custom_alert_type';
...
alertTypeRegistry.register(getCustomAlertType());
```


