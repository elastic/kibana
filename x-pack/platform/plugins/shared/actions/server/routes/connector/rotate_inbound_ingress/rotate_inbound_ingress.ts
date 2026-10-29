/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type { ILicenseState } from '../../../lib';
import { INTERNAL_BASE_ACTION_API_PATH } from '../../../../common';
import type { ActionsRequestHandlerContext } from '../../../types';
import { verifyAccessAndContext } from '../../verify_access_and_context';
import type { RotateInboundIngressParamsV1 } from '../../../../common/routes/connector/apis/rotate_inbound_ingress';
import {
  rotateInboundIngressParamsSchemaV1,
  rotateInboundIngressResponseSchemaV1,
} from '../../../../common/routes/connector/apis/rotate_inbound_ingress';
import { DEFAULT_ACTION_ROUTE_SECURITY } from '../../constants';
import { errorHandler } from '../error_handler';

export const rotateInboundIngressRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ACTION_API_PATH}/connector/{id}/_rotate_event_token`,
      security: DEFAULT_ACTION_ROUTE_SECURITY,
      options: {
        access: 'internal',
        summary: i18n.translate('xpack.actions.rotateInboundIngress.routeSummary', {
          defaultMessage: 'Rotate inbound ingest credentials for a connector',
        }),
      },
      validate: {
        request: {
          params: rotateInboundIngressParamsSchemaV1,
        },
        response: {
          200: {
            description: i18n.translate(
              'xpack.actions.rotateInboundIngress.successResponseDescription',
              {
                defaultMessage:
                  'Indicates a successful call. The new ingest token is returned once as ingest_token.',
              }
            ),
            body: () => rotateInboundIngressResponseSchemaV1,
          },
          400: {
            description: i18n.translate(
              'xpack.actions.rotateInboundIngress.badRequestResponseDescription',
              {
                defaultMessage: 'The connector does not use inbound ingest credentials.',
              }
            ),
          },
          403: {
            description: i18n.translate(
              'xpack.actions.rotateInboundIngress.forbiddenResponseDescription',
              {
                defaultMessage: 'Indicates that this call is forbidden.',
              }
            ),
          },
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        try {
          const actionsClient = (await context.actions).getActionsClient();
          const { id }: RotateInboundIngressParamsV1 = req.params;
          const { ingestToken } = await actionsClient.rotateInboundIngress({ id });

          return res.ok({
            body: { ingest_token: ingestToken },
          });
        } catch (error) {
          return errorHandler(res, error);
        }
      })
    )
  );
};
