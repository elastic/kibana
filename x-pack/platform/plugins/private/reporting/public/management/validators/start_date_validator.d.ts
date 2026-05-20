import type { Moment } from 'moment';
import type { ValidationFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { ScheduledReport } from '../../types';
export declare const getStartDateValidator: (today: Moment, timezone: string, prevStartDate?: string) => ValidationFunc<Partial<ScheduledReport>, string, Moment>;
