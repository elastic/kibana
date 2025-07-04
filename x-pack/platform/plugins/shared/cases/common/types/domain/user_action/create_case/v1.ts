/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { UserActionTypes } from '../action/v1';
import { AssigneesUserActionPayloadRt } from '../assignees/v1';
import { CategoryUserActionPayloadRt } from '../category/v1';
import {
  ConnectorUserActionPayloadRt,
  ConnectorUserActionPayloadWithoutConnectorIdRt,
} from '../connector/v1';
import { CustomFieldsUserActionPayloadRt } from '../custom_fields/v1';
import { DescriptionUserActionPayloadRt } from '../description/v1';
import { SettingsUserActionPayloadRt } from '../settings/v1';
import { TagsUserActionPayloadRt } from '../tags/v1';
import { TitleUserActionPayloadRt } from '../title/v1';

const CommonFieldsRt = rt.strict({
  type: rt.literal(UserActionTypes.create_case),
});

const CommonPayloadAttributesRt = rt.strict({
  assignees: AssigneesUserActionPayloadRt.type.props.assignees,
  description: DescriptionUserActionPayloadRt.type.props.description,
  status: rt.string,
  severity: rt.string,
  tags: TagsUserActionPayloadRt.type.props.tags,
  title: TitleUserActionPayloadRt.type.props.title,
  settings: SettingsUserActionPayloadRt.type.props.settings,
  owner: rt.string,
});

const OptionalPayloadAttributesRt = rt.exact(
  rt.partial({
    category: CategoryUserActionPayloadRt.type.props.category,
    customFields: CustomFieldsUserActionPayloadRt.type.props.customFields,
  })
);

const PayloadAttributesRt = rt.intersection([
  CommonPayloadAttributesRt,
  OptionalPayloadAttributesRt,
]);

export const CreateCaseUserActionRt = rt.intersection([
  CommonFieldsRt,
  rt.strict({
    payload: rt.intersection([ConnectorUserActionPayloadRt, PayloadAttributesRt]),
  }),
]);

export const CreateCaseUserActionWithoutConnectorIdRt = rt.intersection([
  CommonFieldsRt,
  rt.strict({
    payload: rt.intersection([ConnectorUserActionPayloadWithoutConnectorIdRt, PayloadAttributesRt]),
  }),
]);
