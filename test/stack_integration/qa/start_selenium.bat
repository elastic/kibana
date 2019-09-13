@REM Remember this is a batch file
echo on
time /t
java -Dwebdriver.ie.driver=C:\vagrant\qa\IEDriverServer.exe -jar C:\vagrant\qa\selenium-server-standalone-3.4.0.jar

@REM java -Dwebdriver.ie.driver=/c/vagrant/qa/IEDriverServer.exe -jar /c/vagrant/qa/selenium-server-standalone-3.10.0.jar &
@REM c:\vagrant\node_modules\.bin\selenium-standalone.cmd start
time /t
echo "Done"