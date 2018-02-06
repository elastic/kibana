import { uiExportsMixin } from './ui_exports';
import { fieldFormatsMixin } from './field_formats';
import { tutorialsMixin } from './tutorials_mixin';
import { uiAppsMixin } from './ui_apps';
import { uiI18nMixin } from './ui_i18n';
import { uiBundlesMixin } from './ui_bundles';
import { uiNavLinksMixin } from './ui_nav_links';
import { uiRenderMixin } from './ui_render';
import { uiSettingsMixin } from './ui_settings';

export async function uiMixin(kbnServer) {
  await kbnServer.mixin(uiExportsMixin);
  await kbnServer.mixin(uiAppsMixin);
  await kbnServer.mixin(uiBundlesMixin);
  await kbnServer.mixin(uiSettingsMixin);
  await kbnServer.mixin(fieldFormatsMixin);
  await kbnServer.mixin(tutorialsMixin);
  await kbnServer.mixin(uiNavLinksMixin);
  await kbnServer.mixin(uiI18nMixin);
  await kbnServer.mixin(uiRenderMixin);
}
