/**
 * Checks whether authentication provider with the specified type uses Kibana's native login form.
 * @param providerType Type of the authentication provider.
 */
export declare function shouldProviderUseLoginForm(providerType: string): providerType is "basic" | "token";
