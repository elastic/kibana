import type { CoreStart } from '@kbn/core/public';
interface Props {
    type: string;
    uploadUrl: string;
}
type MountProps = Props & Pick<CoreStart, 'analytics' | 'i18n' | 'theme' | 'userProfile'>;
export declare const mountExpiredBanner: ({ type, uploadUrl, ...startServices }: MountProps) => import("@kbn/core/public").MountPoint;
export {};
