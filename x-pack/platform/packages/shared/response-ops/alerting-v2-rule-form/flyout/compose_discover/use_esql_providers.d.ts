import type { RuleFormServices } from '../../form/contexts/rule_form_context';
/**
 * Registers ES|QL Monaco language providers (autocomplete, signature help, hover)
 * for the lifetime of the component that calls this hook.
 *
 * Providers are registered per-hook-instance rather than via a module-level singleton.
 * This avoids two problems with the previous singleton pattern:
 *
 * 1. React Strict Mode double-invokes effects (mount → unmount → mount). The old
 *    `if (registeredDisposables) return` guard caused the second mount to skip
 *    registration entirely, leaving the editor with no autocomplete.
 *
 * 2. Multiple concurrent instances would share one set of providers, so the first
 *    unmount would dispose providers that the second instance still needed.
 *
 * Callbacks are stored in a ref so they stay current across renders without
 * causing the effect to re-run on every render. The effect only re-runs when
 * the callbacks object reference changes (i.e. when services change).
 */
export declare const useEsqlAutocomplete: (services: RuleFormServices) => void;
