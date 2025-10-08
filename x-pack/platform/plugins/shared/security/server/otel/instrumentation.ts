/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type Attributes,
  type Counter,
  type Histogram,
  metrics,
  ValueType,
} from '@opentelemetry/api';

export interface SecurityTelemetryAttributes {
  providerType?: string;
  providerName?: string;
  realm?: string;
  outcome?: 'success' | 'failure';
  application?: string;
  [key: string]: any;
}

class SecurityTelemetry {
  private readonly meter = metrics.getMeter('kibana.security');

  private readonly basicTokenLoginDuration: Histogram<Attributes>;
  private readonly samlLoginDuration: Histogram<Attributes>;
  private readonly oidcLoginDuration: Histogram<Attributes>;
  private readonly userProfileActivationDuration: any;
  private readonly sessionCreationDuration: Histogram<Attributes>;
  private readonly logoutCounter: Counter<Attributes>;
  private readonly privilegeRegistrationDuration: Histogram<Attributes>;

  constructor() {
    this.basicTokenLoginDuration = this.meter.createHistogram('auth.basic_token.login.duration', {
      description: 'Duration of basic/token login attempts',
      unit: 'ms',
      valueType: ValueType.DOUBLE,
    });

    this.samlLoginDuration = this.meter.createHistogram('auth.saml.login.duration', {
      description: 'Duration of SAML login attempts',
      unit: 'ms',
      valueType: ValueType.DOUBLE,
    });

    this.oidcLoginDuration = this.meter.createHistogram('auth.oidc.login.duration', {
      description: 'Duration of OIDC login attempts',
      unit: 'ms',
      valueType: ValueType.DOUBLE,
    });

    this.userProfileActivationDuration = this.meter.createHistogram(
      'auth.user_profile.activation.duration',
      {
        description: 'Duration of user profile activation attempts',
        unit: 'ms',
        valueType: ValueType.DOUBLE,
      }
    );

    this.sessionCreationDuration = this.meter.createHistogram('auth.session.creation.duration', {
      description: 'Duration of session creation attempts',
      unit: 'ms',
      valueType: ValueType.DOUBLE,
    });

    this.logoutCounter = this.meter.createCounter('auth.logout.attempts', {
      description: 'Number of logout attempts',
      unit: '1',
      valueType: ValueType.INT,
    });

    this.privilegeRegistrationDuration = this.meter.createHistogram(
      'auth.privilege.registration.duration',
      {
        description: 'Duration of privilege registration',
        unit: 'ms',
        valueType: ValueType.DOUBLE,
      }
    );
  }

  private transformAttributes(attributes: SecurityTelemetryAttributes): Attributes {
    const { application, providerType, providerName, realm, outcome, ...rest } = attributes;

    const transformed: Attributes = {
      ...(application ? { 'auth.application': application } : {}),
      ...(providerType ? { 'auth.provider.type': providerType } : {}),
      ...(providerName ? { 'auth.provider.name': providerName } : {}),
      ...(realm ? { 'auth.realm': realm } : {}),
      ...(outcome ? { 'auth.outcome': outcome } : {}),
      ...rest,
    };

    return transformed;
  }

  recordBasicTokenLoginDuration = (duration: number, attributes: SecurityTelemetryAttributes) => {
    const transformedAttributes = this.transformAttributes(attributes);

    this.basicTokenLoginDuration.record(duration, transformedAttributes);
  };

  recordSamlLoginDuration = (duration: number, attributes: SecurityTelemetryAttributes) => {
    const transformedAttributes = this.transformAttributes(attributes);
    this.samlLoginDuration.record(duration, transformedAttributes);
  };

  recordOidcLoginDuration = (duration: number, attributes: SecurityTelemetryAttributes) => {
    const transformedAttributes = this.transformAttributes(attributes);
    this.oidcLoginDuration.record(duration, transformedAttributes);
  };

  recordUserProfileActivationDuration = (
    duration: number,
    attributes: SecurityTelemetryAttributes
  ) => {
    const transformedAttributes = this.transformAttributes(attributes);
    this.userProfileActivationDuration.record(duration, transformedAttributes);
  };

  recordSessionCreationDuration = (duration: number, attributes: SecurityTelemetryAttributes) => {
    const transformedAttributes = this.transformAttributes(attributes);
    this.sessionCreationDuration.record(duration, transformedAttributes);
  };

  recordLogoutAttempt = (attributes: SecurityTelemetryAttributes) => {
    const transformedAttributes = this.transformAttributes(attributes);
    this.logoutCounter.add(1, transformedAttributes);
  };

  recordPrivilegeRegistrationDuration = (
    duration: number,
    attributes: SecurityTelemetryAttributes
  ) => {
    const transformedAttributes = this.transformAttributes(attributes);
    this.privilegeRegistrationDuration.record(duration, transformedAttributes);
  };
}

export const securityTelemetry = new SecurityTelemetry();
