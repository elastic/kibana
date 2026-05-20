export type NavigateToPath = ReturnType<typeof useNavigateToPath>;
export declare const useNavigateToPath: () => (path: string | undefined, preserveSearch?: boolean) => Promise<void>;
