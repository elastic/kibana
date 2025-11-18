import { extractDissectPattern } from './extract_dissect_pattern';
import { serializeAST } from './serialize_ast';
import { findDelimiterSequences } from './find_delimiter_sequences';

// Full logs from integration 'handles this third case'
const LOGS = [
  '- 1763468956 2005.11.09 dn700 Nov 9 12:01:01 dn700/dn700 crond(pam_unix)[2912]: session closed for user root',
  '- 1763468957 2005.11.09 dn978 Nov 9 12:01:01 dn978/dn978 crond[2921]: (root) CMD (run-parts /etc/cron.hourly)',
  '- 1763468959 2005.11.09 eadmin2 Nov 9 12:01:01 src@eadmin2 crond(pam_unix)[12636]: session closed for user root',
  '- 1763468959 2005.11.09 dn73 Nov 9 12:01:01 dn73/dn73 crond[2918]: (root) CMD (run-parts /etc/cron.hourly)',
  '- 1763468959 2005.11.09 eadmin2 Nov 9 12:01:01 src@eadmin2 crond(pam_unix)[12636]: session closed for user root',
  '- 1763468959 2005.11.09 dn754 Nov 9 12:01:01 dn754/dn754 crond[2914]: (root) CMD (run-parts /etc/cron.hourly)',
  '- 1763468957 2005.11.09 dn228 Nov 9 12:01:01 dn228/dn228 crond(pam_unix)[2915]: session opened for user root by (uid=0)',
  '- 1763468959 2005.11.09 dn700 Nov 9 12:01:01 dn700/dn700 crond(pam_unix)[2912]: session opened for user root by (uid=0)',
  '- 1763468956 2005.11.09 eadmin2 Nov 9 12:01:01 src@eadmin2 crond(pam_unix)[12636]: session opened for user root by (uid=0)',
  '- 1763468956 2005.11.09 en257 Nov 9 12:01:01 en257/en257 crond(pam_unix)[8950]: session opened for user root by (uid=0)',
];

// Truncated subset to keep test fast while reproducing issue

describe('debug full third case crossing pattern', () => {
  it('prints pattern and delimiters for truncated full set', () => {
    const result = extractDissectPattern(LOGS);
    const pattern = serializeAST(result.ast);
    const delimiters = findDelimiterSequences(LOGS);
    // eslint-disable-next-line no-console
    console.log('DEBUG FULL PATTERN:', pattern);
    // eslint-disable-next-line no-console
    console.log('DEBUG FULL DELIMITERS:', delimiters);
    expect(pattern).toBeTruthy();
  });
});
