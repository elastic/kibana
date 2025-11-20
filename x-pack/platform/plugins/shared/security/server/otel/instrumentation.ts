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

interface BasicAttributes {
  outcome: 'success' | 'failure';
}

interface PrivilegeRegistrationAttributes extends BasicAttributes {
  application: string;
  deletedPrivileges?: number;
}

interface UserAuthenticationAttributes extends BasicAttributes {
  providerType: string;
}

export type SecurityTelemetryAttributes = BasicAttributes &
  Partial<PrivilegeRegistrationAttributes> &
  Partial<UserAuthenticationAttributes>;

class SecurityTelemetry {
  private readonly meter = metrics.getMeter('kibana.security');

  private readonly loginDuration: Histogram<Attributes>;
  private readonly userProfileActivationDuration: Histogram<Attributes>;
  private readonly sessionCreationDuration: Histogram<Attributes>;
  private readonly logoutCounter: Counter<Attributes>;
  private readonly privilegeRegistrationDuration: Histogram<Attributes>;

  constructor() {
    this.loginDuration = this.meter.createHistogram('auth.login.duration', {
      description: 'Duration of login attempts',
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

  private transformAttributes<T extends SecurityTelemetryAttributes>(attributes: T): Attributes {
    const { application, providerType, outcome, deletedPrivileges, ...rest } = attributes;

    const transformed: Attributes = {
      ...(application ? { application } : {}),
      ...(deletedPrivileges ? { 'deleted.privileges': deletedPrivileges } : {}),
      ...(providerType ? { 'auth.provider.type': providerType } : {}),
      ...(outcome ? { 'auth.outcome': outcome } : {}),
      ...rest,
    };

    return transformed;
  }

  recordLoginDuration = (duration: number, attributes: UserAuthenticationAttributes) => {
    const transformedAttributes =
      this.transformAttributes<UserAuthenticationAttributes>(attributes);
    this.loginDuration.record(duration, transformedAttributes);
  };

  recordUserProfileActivationDuration = (
    duration: number,
    attributes: UserAuthenticationAttributes
  ) => {
    const transformedAttributes =
      this.transformAttributes<UserAuthenticationAttributes>(attributes);
    this.userProfileActivationDuration.record(duration, transformedAttributes);
  };

  recordSessionCreationDuration = (duration: number, attributes: UserAuthenticationAttributes) => {
    const transformedAttributes = this.transformAttributes(attributes);
    this.sessionCreationDuration.record(duration, transformedAttributes);
  };

  recordLogoutAttempt = (attributes: BasicAttributes) => {
    const transformedAttributes = this.transformAttributes<BasicAttributes>(attributes);
    this.logoutCounter.add(1, transformedAttributes);
  };

  recordPrivilegeRegistrationDuration = (
    duration: number,
    attributes: PrivilegeRegistrationAttributes
  ) => {
    const transformedAttributes =
      this.transformAttributes<PrivilegeRegistrationAttributes>(attributes);
    this.privilegeRegistrationDuration.record(duration, transformedAttributes);
  };
}

export const securityTelemetry = new SecurityTelemetry();
