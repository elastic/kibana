/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten, isObject, mapValues } from 'lodash';
import { UICapabilities } from 'ui/capabilities';
import { Feature } from '../../../../xpack_main/types';
import { Actions } from './actions';
import { CheckPrivilegesAtResourceResponse } from './check_privileges';
import { CheckPrivilegesDynamically } from './check_privileges_dynamically';

export function disableUICapabilitesFactory(
  server: Record<string, any>,
  request: Record<string, any>
) {
  const {
    security: { authorization },
    xpack_main: xpackMainPlugin,
  } = server.plugins;

  const features: Feature[] = xpackMainPlugin.getFeatures();
  const featureNavLinkIds = features
    .map(feature => feature.navLinkId)
    .filter(navLinkId => navLinkId != null);

  const actions: Actions = authorization.actions;
  const shouldDisableFeatureUICapability = (
    featureId: keyof UICapabilities,
    uiCapability: string
  ) => {
    // if the navLink isn't for a feature that we have registered, we don't wish to
    // disable it based on privileges
    return featureId !== 'navLinks' || featureNavLinkIds.includes(uiCapability);
  };

  const disableAll = (uiCapabilities: UICapabilities) => {
    return mapValues(uiCapabilities, (featureUICapabilities, featureId) =>
      mapValues(featureUICapabilities, (value, uiCapability) => {
        if (typeof value === 'boolean') {
          if (shouldDisableFeatureUICapability(featureId!, uiCapability!)) {
            return false;
          }
          return value;
        }

        if (isObject(value)) {
          return mapValues(value, () => false);
        }

        throw new Error(`Expected value type of boolean or object, but found ${value}`);
      })
    ) as UICapabilities;
  };

  const usingPrivileges = async (uiCapabilities: UICapabilities) => {
    function getActionsForFeatureCapability(
      featureId: string,
      uiCapability: string,
      value: boolean | Record<string, boolean>
    ): string[] {
      if (typeof value === 'boolean') {
        return [actions.ui.get(featureId, uiCapability)];
      }
      if (isObject(value)) {
        return Object.keys(value).map(item => actions.ui.get(featureId, uiCapability, item));
      }
      throw new Error(`Expected value type of boolean or object, but found ${value}`);
    }

    const uiActions = Object.entries(uiCapabilities).reduce<string[]>(
      (acc, [featureId, featureUICapabilities]) => [
        ...acc,
        ...flatten(
          Object.entries(featureUICapabilities).map(([uiCapability, value]) => {
            return getActionsForFeatureCapability(featureId, uiCapability, value);
          })
        ),
      ],
      []
    );

    let checkPrivilegesResponse: CheckPrivilegesAtResourceResponse;
    try {
      const checkPrivilegesDynamically: CheckPrivilegesDynamically = authorization.checkPrivilegesDynamicallyWithRequest(
        request
      );
      checkPrivilegesResponse = await checkPrivilegesDynamically(uiActions);
    } catch (err) {
      // if we get a 401/403, then we want to disable all uiCapabilities, as this
      // is generally when the user hasn't authenticated yet and we're displaying the
      // login screen, which isn't driven any uiCapabilities
      if (err.statusCode === 401 || err.statusCode === 403) {
        server.log(
          ['security', 'debug'],
          `Disabling all uiCapabilities because we received a ${err.statusCode}: ${err.message}`
        );
        return disableAll(uiCapabilities);
      }
      throw err;
    }

    const checkPrivilegesForCapability = (
      enabled: boolean,
      featureId: string,
      ...uiCapabilityParts: string[]
    ) => {
      // if the uiCapability has already been disabled, we don't want to re-enable it
      if (enabled === false) {
        return false;
      }

      const action = actions.ui.get(featureId, ...uiCapabilityParts);
      return checkPrivilegesResponse.privileges[action] === true;
    };

    return mapValues(uiCapabilities, (featureUICapabilities, featureId) => {
      return mapValues(
        featureUICapabilities,
        (value: boolean | Record<string, boolean>, uiCapability) => {
          if (typeof value === 'boolean') {
            if (!shouldDisableFeatureUICapability(featureId!, uiCapability!)) {
              return value;
            }
            return checkPrivilegesForCapability(value, featureId!, uiCapability!);
          }

          if (isObject(value)) {
            const res = mapValues(value, (enabled, subUiCapability) => {
              return checkPrivilegesForCapability(
                enabled,
                featureId!,
                uiCapability!,
                subUiCapability!
              );
            });
            return res;
          }

          throw new Error(
            `Unexpected UI Capability value. Expected boolean or object, but found ${value}`
          );
        }
      );
    }) as UICapabilities;
  };

  return {
    all: disableAll,
    usingPrivileges,
  };
}
