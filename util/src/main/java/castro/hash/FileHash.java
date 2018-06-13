package castro.hash;

import java.io.UnsupportedEncodingException;
import java.math.BigInteger;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

public class FileHash {
  // https://gist.github.com/alecthegeek/333663
  String compute(String content) {
    try {
      var builder = new StringBuilder();
      builder.append("blob ");
      builder.append(content.length());
      builder.append("\0");
      builder.append(content);
      var input = builder.toString().getBytes("UTF-8");

      MessageDigest msdDigest = MessageDigest.getInstance("SHA-1");
      msdDigest.update(input);
      BigInteger n = new BigInteger(msdDigest.digest());
      return n.toString(16);
    } catch (UnsupportedEncodingException | NoSuchAlgorithmException e) {
//      Logger.getLogger(Encriptacion.class.getName()).log(Level.SEVERE, null, e);
    }
    return null;
  }
}
