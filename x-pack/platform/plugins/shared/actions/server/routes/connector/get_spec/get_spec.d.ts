import type { IRouter } from '@kbn/core/server';
import type { ActionsRequestHandlerContext } from '../../../types';
import type { ILicenseState } from '../../../lib';
import type { ActionsConfigurationUtilities } from '../../../actions_config';
/**
 * GET /internal/actions/connector_types/{id}/spec
 *
 * Returns the serialized connector spec as JSON Schema for client-side
 * form generation and validation.
 *
 * Only available for connector types with source === 'spec'.
 */
export declare const getConnectorSpecRoute: (router: IRouter<ActionsRequestHandlerContext>, licenseState: ILicenseState, configurationUtilities: ActionsConfigurationUtilities) => void;
