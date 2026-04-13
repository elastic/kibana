import type { FormSchema } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { IlmPhasesFlyoutFormInternal } from './types';
/**
 * Minimal schema for the ILM phases flyout.
 *
 * All UI controls write to dedicated form fields under `_meta.*`.
 * Output `IlmPolicyPhases` is built by the serializer from those fields.
 */
export declare const getIlmPhasesFlyoutFormSchema: () => FormSchema<IlmPhasesFlyoutFormInternal>;
