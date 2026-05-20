import { type FormSchema } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { RecurringSchedule } from '../types';
export declare const getRecurringScheduleFormSchema: (options?: {
    allowInfiniteRecurrence?: boolean;
}) => FormSchema<RecurringSchedule>;
