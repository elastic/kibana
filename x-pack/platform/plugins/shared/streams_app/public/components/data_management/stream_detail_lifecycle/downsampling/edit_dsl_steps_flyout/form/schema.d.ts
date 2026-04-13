import type { FormSchema } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { DslStepsFlyoutFormInternal } from './types';
/**
 * Minimal schema for the DSL steps flyout.
 *
 * This flyout uses `UseArray` for `_meta.downsampleSteps[]` and provides most
 * field config (defaults/validations) directly on the `<UseField />` components.
 */
export declare const getDslStepsFlyoutFormSchema: () => FormSchema<DslStepsFlyoutFormInternal>;
