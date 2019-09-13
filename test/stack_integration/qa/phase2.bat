@REM Remember this is a batch file
echo on
time /t
cd C:\vagrant\qa

echo %JAVA_HOME% | findstr jdk-10 && (
  @REM the Windows 2016 Server now has both JDK 8 and 10 and we have to switch
  @REM  from 10 to 8 because of https://github.com/elastic/logstash/issues/9316
  @REM SETX sets the system environment variable
  SETX JAVA_HOME "C:\windowsInstalls\8.0.0\elasticsearch\jdk" /M
  @REM and this next line sets the value in our current shell and the git-bash we're about to open
  SET JAVA_HOME=C:\windowsInstalls\8.0.0\elasticsearch\jdk
)

C:\PROGRA~1\Git\git-bash.exe start_phase2.sh
time /t
echo "phase2.sh should have created phase2.marker file, else, we should return an error status"
type phase2.marker
