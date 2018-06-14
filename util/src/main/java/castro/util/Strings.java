package castro.util;

import com.ibm.icu.text.CharsetDetector;
import org.apache.commons.io.output.StringBuilderWriter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.*;
import java.nio.ByteBuffer;
import java.nio.charset.Charset;
import java.nio.charset.CodingErrorAction;
import java.util.Arrays;
import java.util.List;

public class Strings {
  private static Logger logger = LoggerFactory.getLogger(Strings.class);

  public static String toUTF8String(String in) {
    var cd = new CharsetDetector();
    var data = in.getBytes();
    cd.setText(data);

    var charset = Charset.forName(getEncoding(cd));
    return new String(data, charset);
  }

  public static String toUTF8String(InputStream in) {
    try {
      var cd = new CharsetDetector();
      cd.setText(in);
      var encoding = getEncoding(cd);
      var decoder = Charset.forName(encoding).newDecoder();
      // Refer to #662 and http://stackoverflow.com/a/7281034
      decoder.onMalformedInput(CodingErrorAction.REPLACE);
      var reader = new BufferedReader(new InputStreamReader(in, decoder));
      var sw = new StringBuilderWriter();
      org.apache.commons.io.IOUtils.copy(reader, sw);
      reader.close();
      return sw.toString();
    } catch (IOException e) {
      // logger
      logger.error("Convert to UTF8 string error", e);
    }
    return null;
  }

  private static String getEncoding(CharsetDetector cd) {
    var firstClass = List.of("UTF-8", "GB18030");

    var encodingMatches = Arrays.stream(cd.detectAll()).sorted(
        (a, b) -> {
          var firstA = firstClass.contains(a.getName());
          var firstB = firstClass.contains(b.getName());
          if (firstA && firstB)
            return a.compareTo(b);
          else if (firstA)
            return 1;
          else if (firstB)
            return -1;
          else
            return a.compareTo(b);
        }
    );

    var cmOpt = encodingMatches.findAny();
    if (cmOpt.isPresent()) {
      return cmOpt.get().getName();
    } else {
      return "UTF-8";
    }
  }

  public static String getEncoding(ByteBuffer bytes) {
    var cd = new CharsetDetector();
    cd.setText(bytes.array());
    return getEncoding(cd);
  }

  public static String getEncoding(String path) {
    try {
      var fileInput = new BufferedInputStream(new FileInputStream(path));
      var cd = new CharsetDetector();
      cd.setText(fileInput);
      var res = getEncoding(cd);
      fileInput.close();
      return res;
    } catch (IOException e) {
      logger.error("Convert to UTF8 string error", e);
    }
    return null;
  }
}
