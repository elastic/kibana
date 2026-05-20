import type { ValidationFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { ActionsPublicPluginSetup } from '@kbn/actions-plugin/public';
import type { ScheduledReport } from '../../types';
export declare const getEmailsValidator: (validateEmailAddresses: ActionsPublicPluginSetup["validateEmailAddresses"]) => ValidationFunc<Partial<ScheduledReport>, string, string>;
