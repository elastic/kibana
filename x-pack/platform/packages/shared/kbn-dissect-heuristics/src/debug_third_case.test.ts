import { extractDissectPattern } from './extract_dissect_pattern';
import { serializeAST } from './serialize_ast';
import { findDelimiterSequences } from './find_delimiter_sequences';

// Minimal subset of messages from the third case focusing on crond variants
const LOGS = [
  '- 1763468956 2005.11.09 dn700 Nov 9 12:01:01 dn700/dn700 crond(pam_unix)[2912]: session closed for user root',
  '- 1763468957 2005.11.09 dn978 Nov 9 12:01:01 dn978/dn978 crond[2921]: (root) CMD (run-parts /etc/cron.hourly)',
  '- 1763468959 2005.11.09 eadmin2 Nov 9 12:01:01 src@eadmin2 crond(pam_unix)[12636]: session closed for user root',
  '- 1763468959 2005.11.09 dn73 Nov 9 12:01:01 dn73/dn73 crond[2918]: (root) CMD (run-parts /etc/cron.hourly)',
];

describe('debug third case bracket ordering', () => {
  it('prints delimiters and pattern', () => {
    const patternResult = extractDissectPattern(LOGS);
    const pattern = serializeAST(patternResult.ast);
    // Attempt raw delimiter detection for comparison
    const delimiters = findDelimiterSequences(LOGS);

    // Output to console for debugging
    // eslint-disable-next-line no-console
    console.log('DEBUG pattern:', pattern);
    // eslint-disable-next-line no-console
    console.log('DEBUG delimiters:', delimiters);

    expect(pattern).toBeTruthy();
  });
});
