import { getBundledNotices } from './bundled_notices';

const concatNotices = notices => (
  notices.map(notice => notice.text).join('\n')
);

export async function generatePackageNoticeText(pkg) {
  const bundledNotices = concatNotices(await getBundledNotices(pkg.directory));

  const intro = `This product bundles ${pkg.name}@${pkg.version}`;
  const license = ` which is available under ${
    pkg.licenses.length > 1
      ? `the\n"${pkg.licenses.join('", ')} licenses.`
      : `a\n"${pkg.licenses[0]}" license.`
  }`;

  const moreInfo = bundledNotices
    ? `\n${bundledNotices}\n`
    : `  For details, see ${pkg.relative}/.`;

  return `${intro}${license}${moreInfo}`;
}
